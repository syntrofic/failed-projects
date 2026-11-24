import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ModeConfig } from './config.ts';
import { basePort, repoKey } from './identity.ts';
import { probeHealth, waitHealthy, type HealthReport } from './health.ts';
import { closeLogFd, openLogFd } from './logs.ts';
import { pickPort } from './port.ts';
import { clearState, probeState, readState, writeState, type RunState } from './state.ts';
import { captureRef, stopProcess } from './process.ts';
import { repoRoot } from './paths.ts';

const HEALTH_TIMEOUT_MS = 60_000;
const VITE_CLI = join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const CONFIG_WATCHED = [
  'vite.config.ts',
  'package.json',
  'bun.lock',
  'tsconfig.json',
  'index.html',
  '.local/mode.json',
];

export interface StartResult {
  state: RunState;
  health: HealthReport;
  reused: boolean;
  port: number;
}

function randomInstanceId(): string {
  return createHash('sha256').update(crypto.randomUUID()).digest('hex').slice(0, 16);
}

/** 源码指纹：路径 + 大小 + mtime，用于判断「当前进程是否已加载最新源码」。 */
export function sourceFingerprint(): string {
  const hash = createHash('sha256');
  const roots = ['src', 'index.html', 'vite.config.ts', 'package.json'];
  const walk = (path: string) => {
    const absolute = join(repoRoot, path);
    if (!existsSync(absolute)) return;
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      for (const name of readdirSync(absolute).sort()) walk(join(path, name));
      return;
    }
    hash.update(`${relative(repoRoot, absolute)}\0${stat.size}\0${stat.mtimeMs}\0`);
  };
  for (const root of roots) walk(root);
  return hash.digest('hex').slice(0, 12);
}

/** 配置文件（影响构建管线，而非仅模块内容）的最后修改时间。 */
function configMtime(): number {
  let latest = 0;
  for (const file of CONFIG_WATCHED) {
    try {
      latest = Math.max(latest, statSync(join(repoRoot, file)).mtimeMs);
    } catch {
      /* 文件不存在 */
    }
  }
  return latest;
}

function resolveRuntime(): string[] {
  const node = Bun.which('node');
  if (!node) throw new Error('未找到 node，可执行文件不在 PATH 中');
  if (!existsSync(VITE_CLI)) throw new Error('未安装依赖，请先执行 bun install');
  return [node, VITE_CLI];
}

async function launch(config: ModeConfig, port: number): Promise<RunState> {
  const [runtime, ...args] = resolveRuntime();
  if (!runtime) throw new Error('运行时解析失败');
  const instanceId = randomInstanceId();
  const bindHost = config.bindHost;
  const argv = [...args, '--host', bindHost, '--port', String(port)];

  const fd = openLogFd();
  const startedAt = new Date().toISOString();
  const child = spawn(runtime, argv, {
    cwd: repoRoot,
    detached: true,
    stdio: ['ignore', fd, fd],
    env: {
      ...process.env,
      MODE_INSTANCE_ID: instanceId,
      MODE_REPO_KEY: repoKey,
      MODE_PORT: String(port),
      MODE_BIND_HOST: bindHost,
    },
  });
  child.unref();
  closeLogFd(fd);

  if (!child.pid) throw new Error('子进程启动失败');
  const ref = captureRef(child.pid);
  if (!ref) throw new Error('无法读取子进程身份');

  const state: RunState = {
    version: 1,
    instanceId,
    repoKey,
    repoRoot,
    mode: 'local',
    pid: child.pid,
    startTicks: ref.startTicks,
    // 记录的 argv 与 /proc 实际 argv 必须一致，停止时据此核验归属。
    argv: [runtime, ...argv],
    port,
    bindHost,
    startedAt,
    command: [runtime, ...argv],
    buildId: sourceFingerprint(),
  };
  writeState(state);
  return state;
}

export async function startService(
  config: ModeConfig,
  log: { begin(text: string): void; ok(text: string): void; detail(text: string): void },
): Promise<StartResult> {
  const existing = probeState();
  if (existing.status === 'running') {
    const health = await probeHealth(existing.state.port, {
      instanceId: existing.state.instanceId,
      repoKey,
    });
    return {
      state: existing.state,
      health,
      reused: true,
      port: existing.state.port,
    };
  }

  if (readState()) {
    // 状态文件存在但进程身份不符：属于过期记录，清理后重新启动。
    clearState();
  }

  const base = basePort('web', config.portRange.start, config.portRange.size);
  log.begin(`准备端口（基线 ${base}）`);
  const port = await pickPort(base, config.portRange.size, config.bindHost);
  log.ok(port === base ? `端口 ${port} 可用` : `基线端口被占用，改用 ${port}`);

  log.begin('启动 Vite 开发服务器');
  const state = await launch(config, port);
  log.ok(`进程 ${state.pid} 已拉起 · 日志 .local/run/logs/dev.log`);

  log.begin('等待健康检查');
  const health = await waitHealthy(port, { instanceId: state.instanceId, repoKey }, HEALTH_TIMEOUT_MS);
  if (!health.ok) {
    await stopService();
    throw new Error(`服务未能就绪：${health.detail}（见 .local/run/logs/dev.log）`);
  }
  log.ok(`服务已就绪 · v${health.version ?? '未知'}`);

  return { state, health, reused: false, port };
}

export type StopResult =
  | { status: 'stopped'; pid: number }
  | { status: 'not-running' }
  | { status: 'foreign'; pid: number };

/** 停止受管实例：先核验 PID + starttime + argv，无法核验则不操作。 */
export async function stopService(): Promise<StopResult> {
  const state = readState();
  const liveness = probeState();
  if (!state) return { status: 'not-running' };
  if (liveness.status !== 'running') {
    clearState();
    return { status: 'not-running' };
  }
  const ref = { pid: state.pid, startTicks: state.startTicks, argv: state.argv };
  const outcome = await stopProcess(ref, 10_000);
  if (outcome === 'foreign') return { status: 'foreign', pid: state.pid };
  clearState();
  return { status: 'stopped', pid: state.pid };
}

/** 重启：停止后用同一端口范围重新启动，不重新构建。 */
export async function restartService(
  config: ModeConfig,
  log: { begin(text: string): void; ok(text: string): void; detail(text: string): void },
): Promise<StartResult> {
  log.begin('停止现有实例');
  const stopped = await stopService();
  log.ok(stopped.status === 'stopped' ? `已停止 PID ${stopped.pid}` : '没有在运行的实例');
  return startService(config, log);
}

export interface ReloadResult extends StartResult {
  action: 'started' | 'restarted' | 'reused';
  note: string;
}

/**
 * 应用最新代码：
 * - 未运行时启动；
 * - 构建管线配置（vite.config/依赖清单）变更 → 重启，因为这类变更无法热更新；
 * - 否则确认开发服务器正在提供当前模块，源码变更由 HMR 推送到浏览器。
 */
export async function reloadService(
  config: ModeConfig,
  log: { begin(text: string): void; ok(text: string): void; detail(text: string): void },
): Promise<ReloadResult> {
  const existing = probeState();
  if (existing.status !== 'running') {
    const started = await startService(config, log);
    return { ...started, action: 'started', note: '服务此前未运行，已直接启动' };
  }

  const changed = configMtime() > Date.parse(existing.state.startedAt);
  if (changed) {
    log.begin('检测到构建配置变更，重启开发服务器');
    const restarted = await restartService(config, log);
    return { ...restarted, action: 'restarted', note: '构建配置已变更，必须重启才能生效' };
  }

  log.begin('校验开发服务器与源码状态');
  const health = await probeHealth(existing.state.port, {
    instanceId: existing.state.instanceId,
    repoKey,
  });
  if (!health.ok) {
    log.ok(`健康检查失败（${health.detail}），重启恢复`);
    const restarted = await restartService(config, log);
    return { ...restarted, action: 'restarted', note: '原实例健康异常，已重启' };
  }
  const moduleCheck = await fetchModule(existing.state.port);
  if (!moduleCheck.ok) {
    log.ok(`模块校验失败（${moduleCheck.detail}），重启恢复`);
    const restarted = await restartService(config, log);
    return { ...restarted, action: 'restarted', note: '模块服务异常，已重启' };
  }
  log.ok('入口模块可正常获取');

  const stamp = sourceFingerprint();
  writeState({ ...existing.state, buildId: stamp });
  return {
    state: { ...existing.state, buildId: stamp },
    health,
    reused: true,
    port: existing.state.port,
    action: 'reused',
    note: '开发服务器在运行，源码改动由 HMR 直接推送到浏览器',
  };
}

/** 针对性预览检查：入口模块与首页都应可获取，证明服务器在提供最新源码。 */
async function fetchModule(port: number): Promise<{ ok: boolean; detail: string }> {
  const checks = ['/', '/src/main.tsx'];
  for (const path of checks) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        signal: AbortSignal.timeout(3000),
        redirect: 'error',
      });
      if (!response.ok) return { ok: false, detail: `${path} 返回 ${response.status}` };
      await response.arrayBuffer();
    } catch (error) {
      return { ok: false, detail: `${path}：${(error as Error).message}` };
    }
  }
  return { ok: true, detail: '首页与入口模块均可用' };
}
