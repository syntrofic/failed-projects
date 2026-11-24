import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { logDir, logFile } from './paths.ts';
import type { StoragePolicy } from './config.ts';

/** 打开日志写入端；目录不存在时创建（0700）。调用方负责关闭。 */
export function openLogFd(): number {
  mkdirSync(logDir, { recursive: true, mode: 0o700 });
  return openSync(logFile, 'a', 0o600);
}

export function closeLogFd(fd: number): void {
  try {
    closeSync(fd);
  } catch {
    /* 已关闭 */
  }
}

/**
 * 轮转：dev.log → dev.log.1 → dev.log.2 …，总数受 keepLogFiles 限制。
 * 在启动前与成功更新后调用，避免日志无限增长。
 */
export function rotateLogs(policy: StoragePolicy): { rotated: boolean; bytes: number } {
  if (!existsSync(logFile)) return { rotated: false, bytes: 0 };
  const { size } = statSync(logFile);
  const limit = policy.maxLogMiB * 1024 * 1024;
  if (size < limit) return { rotated: false, bytes: size };

  for (let index = policy.keepLogFiles - 1; index >= 1; index -= 1) {
    const from = index === 1 ? logFile : `${logFile}.${index - 1}`;
    const to = `${logFile}.${index}`;
    if (!existsSync(from)) continue;
    rmSync(to, { force: true });
    renameSync(from, to);
  }
  rmSync(`${logFile}.${policy.keepLogFiles}`, { force: true });
  return { rotated: true, bytes: size };
}

export function logFiles(): string[] {
  if (!existsSync(logDir)) return [];
  return readdirSync(logDir)
    .filter((name) => name.startsWith('dev.log'))
    .sort();
}

export function logUsage(): number {
  let total = 0;
  for (const name of logFiles()) {
    try {
      total += statSync(join(logDir, name)).size;
    } catch {
      /* 轮转过程中读到已删除文件 */
    }
  }
  return total;
}

/** 读取日志末尾若干行，供 status 展示与 logs 首次输出。 */
export function tailLines(lines: number): string[] {
  if (!existsSync(logFile)) return [];
  const size = statSync(logFile).size;
  if (size === 0) return [];
  const window = Math.min(size, 256 * 1024);
  const fd = openSync(logFile, 'r');
  try {
    const buffer = Buffer.alloc(window);
    readSync(fd, buffer, 0, window, size - window);
    const text = buffer.toString('utf8');
    return text.split('\n').filter((line) => line !== '').slice(-lines);
  } finally {
    closeSync(fd);
  }
}

/** 跟踪日志：先输出末尾 N 行，随后按偏移增量输出。 */
export async function followLog(lines: number): Promise<void> {
  for (const line of tailLines(lines)) process.stdout.write(`${line}\n`);
  let offset = existsSync(logFile) ? statSync(logFile).size : 0;
  const stop = () => process.exit(0);
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  for (;;) {
    await Bun.sleep(400);
    if (!existsSync(logFile)) {
      offset = 0;
      continue;
    }
    const size = statSync(logFile).size;
    if (size < offset) offset = 0; // 发生轮转
    if (size === offset) continue;
    const fd = openSync(logFile, 'r');
    try {
      const length = size - offset;
      const buffer = Buffer.alloc(length);
      readSync(fd, buffer, 0, length, offset);
      process.stdout.write(buffer.toString('utf8'));
    } finally {
      closeSync(fd);
    }
    offset = size;
  }
}
