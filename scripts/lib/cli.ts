import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildDist } from './build.ts';
import { loadConfig, ConfigError, type ModeConfig } from './config.ts';
import { Console, renderFailure, renderHelp, stripAnsi } from './console.ts';
import type { HelpSpec, RowSpec } from './console.ts';
import { probeHealth, waitHealthy, type HealthReport } from './health.ts';
import { repoKey, displayName } from './identity.ts';
import { LockBusyError, withRepoLock } from './lock.ts';
import { followLog, rotateLogs, logFiles, logUsage, tailLines } from './logs.ts';
import { currentPressure, lastCleanRecord, PRESSURE_LABEL } from './maintenance.ts';
import { lanAddress } from './net.ts';
import { cleanReportFile, displayConfigPath, logFile, repoRoot } from './paths.ts';
import { PortExhaustedError } from './port.ts';
import { probeState, readState } from './state.ts';
import { formatBytes, filesystemUsage, planClean, executeClean, writeCleanRecord, scanCaches } from './storage.ts';
import type { CleanCandidate } from './storage.ts';
import { reloadService, restartService, startService, stopService } from './services.ts';

const PROJECT_TITLE = '门户网站 · 开发环境';
const MODE_LABEL = 'local · 本机 Vite 开发服务器（HTTP）';

interface Options {
  json: boolean;
  dryRun: boolean;
  forwarded: string[];
}

function parseArgs(argv: string[]): { command: string; options: Options } {
  const positional: string[] = [];
  const forwarded: string[] = [];
  const options: Options = { json: false, dryRun: false, forwarded };
  for (const arg of argv) {
    if (arg === '--json') options.json = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--')) forwarded.push(arg);
    else positional.push(arg);
  }
  return { command: positional[0] ?? 'help', options };
}

function urlOf(port: number, host: string): string {
  return `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`;
}

function durationLabel(startedAt: string): string {
  const ms = Date.now() - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return '未获取';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return `${Math.max(1, Math.floor(ms / 1000))} 秒`;
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时 ${minutes % 60} 分钟`;
  return `${Math.floor(hours / 24)} 天 ${hours % 24} 小时`;
}

interface Snapshot {
  config: ModeConfig;
  health: HealthReport | null;
  running: boolean;
  port: number | null;
  bindHost: string;
  pid: number | null;
  instanceId: string | null;
  startedAt: string | null;
  buildId: string | null;
  staleReason: string | null;
  /** 配置文件里的监听设置与运行实例不一致时给出提示（重启才生效）。 */
  configDrift: string | null;
}

async function snapshot(config: ModeConfig): Promise<Snapshot> {
  const liveness = probeState();
  if (liveness.status !== 'running') {
    return {
      config,
      health: null,
      running: false,
      port: readState()?.port ?? null,
      bindHost: config.bindHost,
      pid: null,
      instanceId: null,
      startedAt: null,
      buildId: null,
      staleReason: readState() ? liveness.reason : null,
      configDrift: null,
    };
  }
  const { state } = liveness;
  const health = await probeHealth(state.port, { instanceId: state.instanceId, repoKey });
  return {
    config,
    health,
    running: true,
    port: state.port,
    bindHost: state.bindHost,
    pid: state.pid,
    instanceId: state.instanceId,
    startedAt: state.startedAt,
    buildId: state.buildId,
    staleReason: null,
    configDrift:
      state.bindHost === config.bindHost
        ? null
        : `配置为 ${config.bindHost}，运行中为 ${state.bindHost}，需 mode:restart 生效`,
  };
}

function storageRows(config: ModeConfig): RowSpec[] {
  const usage = filesystemUsage();
  const { pressure } = currentPressure(config);
  const record = lastCleanRecord();
  const cacheBytes = scanCaches()
    .filter((target) => target.exists)
    .reduce((sum, target) => sum + target.bytes, 0);
  const rows: RowSpec[] = [
    {
      label: '磁盘空间',
      value: `${usage.usedPercent.toFixed(1)}% 已用 · 剩余 ${formatBytes(usage.freeBytes)} · 压力 ${PRESSURE_LABEL[pressure]}`,
      tone: pressure === 'critical' ? 'red' : pressure === 'normal' ? undefined : 'yellow',
    },
    {
      label: '缓存占用',
      value: `${formatBytes(cacheBytes)} / 预算 ${config.storage.cacheBudgetMiB} MiB（仅 dist 与 Vite 预构建缓存计入统计）`,
    },
    {
      label: '日志占用',
      value: `${logFiles().length} 个文件 · ${formatBytes(logUsage())} · 单文件上限 ${config.storage.maxLogMiB} MiB × ${config.storage.keepLogFiles}`,
    },
  ];
  rows.push({
    label: '最近清理',
    value: record
      ? `${new Date(record.at).toLocaleString('zh-CN')} · 回收 ${formatBytes(record.reclaimBytes)} · ${record.paths.length} 项`
      : '本次运行尚无清理记录',
  });
  return rows;
}

function renderStatusPanel(snap: Snapshot, con: Console): string {
  const { config } = snap;
  const healthy = snap.health?.ok ?? false;
  const badge = snap.running
    ? healthy
      ? { text: '运行正常', tone: 'green' as const }
      : { text: '健康异常', tone: 'red' as const }
    : { text: '已停止', tone: 'dim' as const };

  const access: RowSpec[] = [];
  if (snap.running && snap.port !== null) {
    access.push({ label: '访问地址', value: urlOf(snap.port, snap.bindHost), tone: 'cyan' });
    const lan = lanAddress();
    if (snap.bindHost === '0.0.0.0' && lan) {
      access.push({ label: '局域网', value: `http://${lan}:${snap.port}`, tone: 'cyan' });
    }
    access.push({ label: '监听范围', value: `${snap.bindHost}:${snap.port}` });
  } else {
    access.push({ label: '访问地址', value: '服务未运行，执行 bun run mode:start 后获取' });
    access.push({ label: '监听范围', value: `${snap.bindHost}（配置于 ${displayConfigPath}）` });
    if (snap.staleReason) access.push({ label: '上次状态', value: snap.staleReason });
  }
  access.push({
    label: '当前模式',
    value: MODE_LABEL,
  });
  access.push({
    label: 'TLS',
    value: '本地 HTTP，由外围网关终止 TLS 并提供证书',
  });

  const runtimeRows: RowSpec[] = [];
  if (snap.running) {
    runtimeRows.push({
      label: '健康检查',
      value: healthy
        ? `✓ ${snap.health?.detail ?? ''}${snap.health?.version ? ` · v${snap.health.version}` : ''}`
        : `✗ ${snap.health?.detail ?? '未获取'}`,
      tone: healthy ? 'green' : 'red',
    });
    runtimeRows.push({
      label: '运行进程',
      value: `PID ${snap.pid} · 已运行 ${snap.startedAt ? durationLabel(snap.startedAt) : '未获取'}`,
    });
    runtimeRows.push({ label: '构建标识', value: `${snap.buildId ?? '未获取'}（源码指纹）` });
    if (snap.configDrift) runtimeRows.push({ label: '配置变更', value: snap.configDrift, tone: 'yellow' });
  } else {
    runtimeRows.push({ label: '健康检查', value: '— 服务未运行' });
    runtimeRows.push({ label: '运行进程', value: '—' });
  }

  const diag: RowSpec[] = [
    { label: '项目目录', value: repoRoot },
    { label: '仓库标识', value: displayName() },
    { label: '本地配置', value: join(repoRoot, displayConfigPath) },
    { label: '日志文件', value: logFile },
    ...storageRows(config),
  ];

  const footer = snap.running
    ? 'mode:logs 查看日志 · mode:reload 更新预览 · mode:stop 停止服务'
    : 'mode:start 启动开发服务器 · mode:help 查看全部命令';

  return con.panel({
    title: PROJECT_TITLE,
    badge,
    sections: [access, runtimeRows, diag],
    footer,
  });
}

function printStatus(snap: Snapshot, json: boolean): void {
  const con = new Console();
  if (json) {
    const payload = {
      project: 'portal-website',
      mode: 'local',
      running: snap.running,
      healthy: snap.health?.ok ?? false,
      healthDetail: snap.health?.detail ?? null,
      url: snap.running && snap.port !== null ? urlOf(snap.port, snap.bindHost) : null,
      lanUrl:
        snap.running && snap.port !== null && snap.bindHost === '0.0.0.0' && lanAddress()
          ? `http://${lanAddress()}:${snap.port}`
          : null,
      bindHost: snap.bindHost,
      port: snap.port,
      pid: snap.pid,
      instanceId: snap.instanceId,
      startedAt: snap.startedAt,
      buildId: snap.buildId,
      tls: 'terminated-by-gateway',
      repoRoot,
      repoId: displayName(),
      configPath: join(repoRoot, displayConfigPath),
      logPath: logFile,
      storage: storageRows(snap.config).map((row) => ({ label: stripAnsi(row.label), value: stripAnsi(row.value) })),
    };
    con.write(JSON.stringify(payload, null, 2));
    return;
  }
  con.write(renderStatusPanel(snap, con));
}

function helpSpec(config: ModeConfig): HelpSpec {
  return {
    title: '门户网站 · 开发命令',
    usage: 'bun run mode:<命令> [--json] [--dry-run]',
    facts: [
      { label: '当前模式', value: MODE_LABEL },
      { label: '默认行为', value: 'mode:start 首次启动即创建本地配置并派生端口' },
      { label: '协议', value: '本地 HTTP；生产环境 TLS 由外围网关终止（不在本仓库签发证书）' },
    ],
    groups: [
      {
        title: '开发服务',
        commands: [
          { name: 'mode:start', description: '启动本地开发服务器（HTTP 监听，TLS 由外围网关终止）' },
          { name: 'mode:stop', description: '停止受管开发服务器，保留日志与配置' },
          { name: 'mode:reload', description: '应用最新代码并准备预览：源码走 HMR，配置变更则重启' },
          { name: 'mode:restart', description: '重启现有进程，不重新构建、不清理缓存' },
        ],
      },
      {
        title: '状态与排障',
        commands: [
          { name: 'mode:status', description: '查看运行状态、访问地址、资源占用与诊断信息' },
          { name: 'mode:health', description: '探测服务健康；失败时退出码非零（--json 供自动化使用）' },
          { name: 'mode:logs', description: '跟踪开发服务器日志（Ctrl+C 退出）' },
          { name: 'mode:help', description: '显示本帮助' },
        ],
      },
      {
        title: '构建与维护',
        commands: [
          { name: 'mode:build', description: '生产构建到 dist/（类型检查 + Vite 打包）' },
          { name: 'mode:clean', description: '预览可回收的可重建产物；加 --dry-run 仅预览' },
        ],
      },
    ],
    examples: [
      'bun run mode:start',
      'bun run mode:reload',
      'bun run mode:status -- --json',
      'bun run mode:clean -- --dry-run',
    ],
    notes: [
      '配置保存在仓库内被 Git 忽略的 .local/mode.json，端口、监听范围与存储策略都在这里调整。',
      '端口由仓库路径派生基线，冲突时有界顺延并记录实际端口；不会杀掉其他进程。',
      `日志按 ${config.storage.maxLogMiB} MiB 轮转，保留 ${config.storage.keepLogFiles} 份。`,
      `磁盘水位触发 75% / 85% / 92%（退出 70% / 78% / 85%），缓存预算 ${config.storage.cacheBudgetMiB} MiB、闲置 ${config.storage.idleDays} 天。`,
      '没有定时任务：清理只在构建前和构建成功后执行，闲置项目不会自行回收。',
    ],
    footer: 'mode:status 查看当前状态 · mode:help 随时回看本页',
  };
}

function printJson(value: unknown, con: Console): void {
  con.write(JSON.stringify(value, null, 2));
}

async function requireConfig(): Promise<ModeConfig> {
  const { config, created } = loadConfig();
  if (created) {
    const con = new Console();
    con.write(con.note(`已创建本地配置 ${displayConfigPath}（默认值，可提交前自行调整）`));
  }
  return config;
}

async function commandStart(options: Options): Promise<number> {
  const config = await requireConfig();
  const con = new Console();
  const result = await withRepoLock(async () => {
    if (options.json) {
      const snap0 = await snapshot(config);
      if (snap0.running) return { kind: 'reused' as const, snap: snap0 };
      const started = await startService(config, con.steps(3));
      const snap = await snapshot(config);
      return { kind: 'started' as const, snap, started };
    }
    const before = probeState();
    if (before.status === 'running') {
      const snap = await snapshot(config);
      con.write(renderStatusPanel(snap, con));
      return { kind: 'reused' as const, snap };
    }
    const rotated = rotateLogs(config.storage);
    if (rotated.rotated) con.write(con.note(`日志已轮转（${formatBytes(rotated.bytes)}）`));
    const started = await startService(config, con.steps(3));
    const snap = await snapshot(config);
    con.write('');
    con.write(renderStatusPanel(snap, con));
    void started;
    return { kind: 'started' as const, snap };
  });

  if (options.json) {
    printJson(summarize(result.snap, result.kind === 'reused' ? 'already-running' : 'started'), con);
  }
  return result.snap.running ? 0 : 1;
}

function summarize(snap: Snapshot, action: string): Record<string, unknown> {
  return {
    action,
    running: snap.running,
    healthy: snap.health?.ok ?? false,
    url: snap.running && snap.port !== null ? urlOf(snap.port, snap.bindHost) : null,
    port: snap.port,
    pid: snap.pid,
    buildId: snap.buildId,
    tls: 'terminated-by-gateway',
  };
}

async function commandStop(options: Options): Promise<number> {
  const config = await requireConfig();
  const con = new Console();
  const result = await withRepoLock(async () => stopService());
  const snap = await snapshot(config);
  if (options.json) {
    printJson({ action: result.status, running: snap.running }, con);
    return 0;
  }
  if (result.status === 'not-running') {
    con.write(renderStatusPanel(snap, con));
    return 0;
  }
  if (result.status === 'foreign') {
    const body = `PID ${result.pid} 的进程身份与记录不符，未发送任何信号。\n请确认该进程是否仍属于本项目。`;
    con.write(renderFailure(PROJECT_TITLE, body, 'bun run mode:status 查看归属信息'));
    return 1;
  }
  con.write(renderStatusPanel(snap, con));
  return 0;
}

async function commandRestart(options: Options): Promise<number> {
  const config = await requireConfig();
  const con = new Console();
  const snap = await withRepoLock(async () => {
    // 停止 1 步 + 端口/启动/健康 3 步。
    await restartService(config, con.steps(4));
    return snapshot(config);
  });
  if (options.json) {
    printJson(summarize(snap, 'restarted'), con);
    return snap.running ? 0 : 1;
  }
  con.write('');
  con.write(renderStatusPanel(snap, con));
  return snap.running ? 0 : 1;
}

async function commandReload(options: Options): Promise<number> {
  const config = await requireConfig();
  const con = new Console();
  const { result, snap } = await withRepoLock(async () => {
    // 校验 1 步；若需重启则再加停止 1 步 + 端口/启动/健康 3 步。
    const reloaded = await reloadService(config, con.steps(5));
    rotateLogs(config.storage);
    return { result: reloaded, snap: await snapshot(config) };
  });
  if (options.json) {
    printJson({ ...summarize(snap, result.action), note: result.note }, con);
    return snap.running ? 0 : 1;
  }
  con.write('');
  con.write(con.note(result.note));
  con.write(renderStatusPanel(snap, con));
  return snap.running ? 0 : 1;
}

async function commandStatus(options: Options): Promise<number> {
  const config = await requireConfig();
  const snap = await snapshot(config);
  printStatus(snap, options.json);
  return 0;
}

async function commandHealth(options: Options): Promise<number> {
  await requireConfig();
  const con = new Console();
  const liveness = probeState();
  if (liveness.status !== 'running') {
    if (options.json) {
      printJson({ healthy: false, reason: 'not-running' }, con);
      return 1;
    }
    con.write(
      con.panel({
        title: '门户网站 · 健康检查',
        badge: { text: '未运行', tone: 'dim' },
        sections: [
          [{ label: '结果', value: '✗ 服务未运行' }],
          [{ label: '下一步', value: 'bun run mode:start 启动开发服务器' }],
        ],
        footer: 'mode:start 启动 · mode:status 查看状态',
      }),
    );
    return 1;
  }

  const report = await waitHealthy(
    liveness.state.port,
    { instanceId: liveness.state.instanceId, repoKey },
    5000,
  );
  if (options.json) {
    printJson(
      {
        healthy: report.ok,
        detail: report.detail,
        version: report.version ?? null,
        uptimeSeconds: report.uptime ?? null,
        url: urlOf(liveness.state.port, liveness.state.bindHost),
        instanceId: liveness.state.instanceId,
      },
      con,
    );
    return report.ok ? 0 : 1;
  }

  con.write(
    con.panel({
      title: '门户网站 · 健康检查',
      badge: report.ok ? { text: '正常', tone: 'green' } : { text: '异常', tone: 'red' },
      sections: [
        [
          { label: '结果', value: report.ok ? '✓ 服务已就绪' : `✗ ${report.detail}`, tone: report.ok ? 'green' : 'red' },
          { label: '版本', value: report.version ?? '未获取' },
          { label: '运行时长', value: report.uptime === undefined ? '未获取' : `${report.uptime} 秒` },
        ],
        [
          { label: '探测地址', value: urlOf(liveness.state.port, '127.0.0.1'), tone: 'cyan' },
          { label: '实例标识', value: liveness.state.instanceId },
        ],
      ],
      footer: report.ok ? 'mode:logs 查看日志 · mode:status 查看状态' : 'mode:logs 查看日志 · mode:restart 重启恢复',
    }),
  );
  return report.ok ? 0 : 1;
}

async function commandBuild(options: Options): Promise<number> {
  const config = await requireConfig();
  const con = new Console();
  const result = await withRepoLock(async () => {
    const built = await buildDist(config, con.steps(3));
    const rotated = rotateLogs(config.storage);
    return { built, rotated };
  });
  if (options.json) {
    printJson({ action: 'built', ...result.built }, con);
    return 0;
  }
  con.write('');
  con.write(
    con.panel({
      title: '门户网站 · 生产构建',
      badge: { text: '构建完成', tone: 'green' },
      sections: [
        [
          { label: '产物目录', value: result.built.outDir },
          { label: '文件数量', value: `${result.built.files} 个 · ${formatBytes(result.built.bytes)}` },
          { label: '构建标识', value: result.built.buildId },
          { label: '耗时', value: `${(result.built.durationMs / 1000).toFixed(1)} 秒` },
        ],
        [{ label: '部署方式', value: '把 dist/ 交给外围网关/静态服务；TLS 与域名由网关负责' }],
      ],
      footer: 'mode:clean -- --dry-run 查看可回收缓存 · mode:status 查看开发服务',
    }),
  );
  if (result.rotated.rotated) con.write(con.note(`日志已轮转（${formatBytes(result.rotated.bytes)}）`));
  return 0;
}

async function commandClean(options: Options): Promise<number> {
  const config = await requireConfig();
  const con = new Console();
  const { pressure } = currentPressure(config);
  const plan = planClean(config.storage, pressure);

  if (options.json) {
    printJson(
      {
        dryRun: options.dryRun,
        pressure,
        usedPercent: Number(plan.usage.usedPercent.toFixed(2)),
        reclaimBytes: plan.reclaimBytes,
        candidates: plan.candidates.map((candidate) => ({
          path: candidate.path,
          bytes: candidate.bytes,
          reason: candidate.reason,
          skipped: candidate.skip ?? null,
        })),
      },
      con,
    );
    return 0;
  }

  const action = options.dryRun
    ? null
    : await withRepoLock(async () =>
        executeClean(plan),
      );

  const rows: RowSpec[] = [
    {
      label: '磁盘空间',
      value: `${plan.usage.usedPercent.toFixed(1)}% 已用 · 剩余 ${formatBytes(plan.usage.freeBytes)} · 压力 ${PRESSURE_LABEL[pressure]}`,
      tone: pressure === 'critical' ? 'red' : pressure === 'normal' ? undefined : 'yellow',
    },
    {
      label: '回收计划',
      value:
        plan.reclaimBytes === 0
          ? '当前没有可回收项'
          : `可回收 ${formatBytes(plan.reclaimBytes)}（${plan.candidates.filter((c) => !c.skip).length} 项）`,
    },
    {
      label: '缓存预算',
      value: `${config.storage.cacheBudgetMiB} MiB · 闲置 ${config.storage.idleDays} 天后按压力级别回收`,
    },
  ];

  const detail: RowSpec[] =
    plan.candidates.length === 0
      ? [{ label: '可重建产物', value: '目录尚不存在或已清理' }]
      : plan.candidates.map((candidate) => ({
          label: candidate.kind === 'dist' ? '构建产物' : 'Vite 缓存',
          value: candidate.skip
            ? `${candidate.path} · 跳过：${candidate.skip}`
            : `${candidate.path} · ${formatBytes(candidate.bytes)} · ${candidate.reason}`,
          tone: candidate.skip ? undefined : 'green',
        }));

  if (action && plan.reclaimBytes > 0) {
    writeCleanRecord(cleanReportFile, {
      at: new Date().toISOString(),
      pressure,
      reclaimBytes: action.removed.reduce((sum, c) => sum + c.bytes, 0),
      paths: action.removed.map((c) => c.path),
      failures: action.failed,
    });
  }

  con.write(
    con.panel({
      title: options.dryRun ? '门户网站 · 清理预览（只读）' : '门户网站 · 清理结果',
      badge: options.dryRun ? { text: '仅预览', tone: 'dim' } : action && action.failed.length > 0 ? { text: '部分失败', tone: 'yellow' } : { text: '完成', tone: 'green' },
      sections: [rows, detail, await postCleanRows(action)],
      footer: options.dryRun ? 'mode:clean 执行清理 · mode:build 重新生成产物' : 'mode:build 重新生成产物 · mode:status 查看状态',
    }),
  );
  return action && action.failed.length > 0 ? 1 : 0;
}

async function postCleanRows(
  action: { removed: CleanCandidate[]; failed: string[] } | null,
): Promise<RowSpec[]> {
  if (!action) return [{ label: '保护范围', value: '源码、配置、.local 运行状态与日志、依赖目录均不在清理范围' }];
  const usage = filesystemUsage();
  const rows: RowSpec[] = [
    {
      label: '实际回收',
      value: `${formatBytes(action.removed.reduce((sum, c) => sum + c.bytes, 0))} · ${action.removed.length} 项`,
    },
    { label: '清理后', value: `${usage.usedPercent.toFixed(1)}% 已用 · 剩余 ${formatBytes(usage.freeBytes)}` },
  ];
  for (const failure of action.failed) rows.push({ label: '未清理', value: failure, tone: 'yellow' });
  return rows;
}

async function commandLogs(options: Options): Promise<number> {
  const con = new Console();
  if (!existsSync(logFile) || logUsage() === 0) {
    con.write(
      con.panel({
        title: '门户网站 · 运行日志',
        badge: { text: '暂无日志', tone: 'dim' },
        sections: [[{ label: '日志文件', value: logFile }]],
        footer: 'mode:start 启动后即可在此查看日志',
      }),
    );
    return 0;
  }
  if (options.json) {
    printJson({ path: logFile, files: logFiles(), tail: tailLines(40) }, con);
    return 0;
  }
  await followLog(40);
  return 0;
}

async function commandHelp(): Promise<number> {
  const config = await requireConfig();
  const con = new Console();
  con.write(renderHelp(helpSpec(config), con));
  return 0;
}

const COMMANDS: Record<string, (options: Options) => Promise<number>> = {
  start: commandStart,
  stop: commandStop,
  restart: commandRestart,
  reload: commandReload,
  status: commandStatus,
  health: commandHealth,
  build: commandBuild,
  clean: commandClean,
  logs: commandLogs,
  help: commandHelp,
};

export async function runCli(argv: string[]): Promise<number> {
  const { command, options } = parseArgs(argv);
  const handler = COMMANDS[command];
  if (!handler) {
    const con = new Console();
    con.write(
      con.panel({
        title: '门户网站 · 未知命令',
        badge: { text: '失败', tone: 'red' },
        sections: [[{ label: '输入', value: `mode:${command}` }]],
        footer: 'mode:help 查看全部可用命令',
      }),
    );
    return 1;
  }

  try {
    return await handler(options);
  } catch (error) {
    const con = new Console();
    if (error instanceof ConfigError) {
      con.write(
        con.panel({
          title: PROJECT_TITLE,
          badge: { text: '配置错误', tone: 'red' },
          sections: [
            [{ label: '配置', value: join(repoRoot, displayConfigPath) }],
            [{ label: '问题', value: error.message, tone: 'red' }],
          ],
          footer: '修正配置后重试；不会静默重置你的选择',
        }),
      );
      return 1;
    }
    if (error instanceof LockBusyError || error instanceof PortExhaustedError) {
      con.write(
        con.panel({
          title: PROJECT_TITLE,
          badge: { text: '无法执行', tone: 'yellow' },
          sections: [[{ label: '原因', value: error.message, tone: 'yellow' }]],
          footer: '解除占用后重试 · mode:status 查看当前状态',
        }),
      );
      return 1;
    }
    const message = error instanceof Error ? error.message : String(error);
    con.write(
      con.panel({
        title: PROJECT_TITLE,
        badge: { text: '失败', tone: 'red' },
        sections: [[{ label: '错误', value: message, tone: 'red' }]],
        footer: 'mode:logs 查看日志 · mode:status 查看状态',
      }),
    );
    return 1;
  }
}


