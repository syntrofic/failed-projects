import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ModeConfig } from './config.ts';
import { checkSpaceBeforeBuild } from './maintenance.ts';
import { repoRoot } from './paths.ts';
import { sourceFingerprint } from './services.ts';

export interface BuildResult {
  outDir: string;
  files: number;
  bytes: number;
  buildId: string;
  durationMs: number;
}

interface BuildLogger {
  begin(text: string): void;
  ok(text: string): void;
  detail(text: string): void;
}

/** 生产构建：tsc 类型检查 + vite build，产物在 dist/。 */
export async function buildDist(config: ModeConfig, log: BuildLogger): Promise<BuildResult> {
  const startedAt = Date.now();

  log.begin('检查磁盘空间');
  const space = checkSpaceBeforeBuild(config);
  if (space.blocked) {
    throw new Error(
      `磁盘使用率 ${space.usagePercent.toFixed(1)}%，已达临界水位且无可回收缓存，拒绝开始构建`,
    );
  }
  log.ok(`${space.usagePercent.toFixed(1)}% 已用 · 压力级别 ${space.pressureLabel}`);
  for (const line of space.cleanReport ?? []) log.detail(line);

  log.begin('清空上一版构建产物');
  const outDir = join(repoRoot, 'dist');
  rmSync(outDir, { recursive: true, force: true });
  log.ok('dist/ 已清空');

  log.begin('执行生产构建（tsc --noEmit && vite build）');
  const proc = Bun.spawn({
    cmd: [process.execPath, 'run', 'build'],
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const tail = `${stdout}\n${stderr}`
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-12);
    for (const line of tail) log.detail(line);
    throw new Error(`构建失败（退出码 ${exitCode}），详见上方输出`);
  }

  const stats = distStats(outDir);
  log.ok(`构建完成 · ${stats.files} 个文件 · ${(stats.bytes / 1024).toFixed(0)} KiB`);

  return {
    outDir,
    files: stats.files,
    bytes: stats.bytes,
    buildId: sourceFingerprint(),
    durationMs: Date.now() - startedAt,
  };
}

function distStats(dir: string): { files: number; bytes: number } {
  if (!existsSync(dir)) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const child = join(current, entry.name);
      if (entry.isDirectory()) stack.push(child);
      else {
        files += 1;
        bytes += statSync(child).size;
      }
    }
  }
  return { files, bytes };
}
