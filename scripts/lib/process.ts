import { readFileSync, readlinkSync } from 'node:fs';

/**
 * 进程身份核验（Linux /proc）。
 * 记录启动时的 PID + starttime（boot 后 tick），防止 PID 重用后误判/误杀。
 */
export interface ProcessRef {
  pid: number;
  /** /proc/<pid>/stat 第 22 字段，用于识别 PID 重用。 */
  startTicks: string;
  /** 启动时的完整 argv，停止前比对以避免归属错误。 */
  argv: string[];
}

export interface LiveProcess {
  pid: number;
  startTicks: string;
  argv: string[];
  cwd: string;
}

function startTicksOf(pid: number): string | null {
  let stat: string;
  try {
    stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
  } catch {
    return null;
  }
  // comm 可能含空格与括号，取最后一个 ')' 之后的内容。
  const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  return fields[19] ?? null;
}

export function readProcess(pid: number): LiveProcess | null {
  const startTicks = startTicksOf(pid);
  if (startTicks === null) return null;

  let argv: string[] = [];
  try {
    argv = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean);
  } catch {
    /* 进程刚退出或无权读取。 */
  }

  let cwd = '';
  try {
    cwd = readlinkSync(`/proc/${pid}/cwd`);
  } catch {
    /* 权限不足时留空，不参与身份判定。 */
  }

  return { pid, startTicks, argv, cwd };
}

export function captureRef(pid: number): ProcessRef | null {
  const live = readProcess(pid);
  if (!live) return null;
  return { pid: live.pid, startTicks: live.startTicks, argv: live.argv };
}

export function isSameProcess(ref: ProcessRef): boolean {
  const live = readProcess(ref.pid);
  if (!live || live.startTicks !== ref.startTicks) return false;
  return live.argv.join('\0') === ref.argv.join('\0');
}

/** 轮询等待进程退出；返回是否已退出。 */
export async function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (startTicksOf(pid) === null) return true;
    await Bun.sleep(100);
  }
  return startTicksOf(pid) === null;
}

/** 先 SIGTERM 进程组，超时后再次核验身份再 SIGKILL。 */
export async function stopProcess(
  ref: ProcessRef,
  timeoutMs = 10_000,
): Promise<'exited' | 'killed' | 'foreign'> {
  if (!isSameProcess(ref)) return 'foreign';
  try {
    process.kill(-ref.pid, 'SIGTERM');
  } catch {
    try {
      process.kill(ref.pid, 'SIGTERM');
    } catch {
      return 'exited';
    }
  }
  if (await waitForExit(ref.pid, timeoutMs)) return 'exited';
  if (!isSameProcess(ref)) return 'foreign';
  try {
    process.kill(-ref.pid, 'SIGKILL');
  } catch {
    try {
      process.kill(ref.pid, 'SIGKILL');
    } catch {
      return 'exited';
    }
  }
  return (await waitForExit(ref.pid, 5000)) ? 'killed' : 'foreign';
}

