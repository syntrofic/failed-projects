import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { lockDir } from './paths.ts';

export class LockBusyError extends Error {}

const LOCK_FILE = join(lockDir, 'owner.json');
const ACQUIRE_TIMEOUT_MS = 30_000;
/** owner 存活但长时间未推进时的放弃线，防止残留目录永久阻塞。 */
const STALE_AFTER_MS = 10 * 60_000;

interface Owner {
  pid: number;
  startTicks: string;
  at: number;
}

function startTicksOf(pid: number): string | null {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19] ?? null;
  } catch {
    return null;
  }
}

function readOwner(): Owner | null {
  try {
    return JSON.parse(readFileSync(LOCK_FILE, 'utf8')) as Owner;
  } catch {
    return null;
  }
}

function isOwnerAlive(owner: Owner): boolean {
  const ticks = startTicksOf(owner.pid);
  return ticks !== null && ticks === owner.startTicks;
}

function release(): void {
  rmSync(lockDir, { recursive: true, force: true });
}

/**
 * 仓库级互斥锁：mkdir 的原子性保证单写者。
 * 覆盖 mode 切换与整个 start/stop/restart/reload/build/clean 操作；
 * 监督进程不继承本锁，父进程退出即释放。
 */
export async function withRepoLock<T>(task: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  for (;;) {
    try {
      mkdirSync(lockDir);
      const ticks = startTicksOf(process.pid);
      if (ticks === null) throw new Error('无法读取自身进程状态');
      writeFileSync(
        LOCK_FILE,
        JSON.stringify({ pid: process.pid, startTicks: ticks, at: Date.now() }),
        { mode: 0o600 },
      );
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        mkdirSync(join(lockDir, '..'), { recursive: true });
        continue;
      }
      const owner = readOwner();
      // owner 缺失/已死或超期：判定为残留锁，回收后重试。
      if (!owner || !isOwnerAlive(owner) || Date.now() - owner.at > STALE_AFTER_MS) {
        release();
        continue;
      }
      if (Date.now() > deadline) {
        throw new LockBusyError(`另一个 mode 命令正在执行（PID ${owner.pid}），请稍后重试`);
      }
      await Bun.sleep(150);
    }
  }

  try {
    return await task();
  } finally {
    release();
  }
}
