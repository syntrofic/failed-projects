import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  statfsSync,
  writeFileSync,
} from 'node:fs';
import type { Dirent } from 'node:fs';
import { join } from 'node:path';
import type { StoragePolicy } from './config.ts';
import { repoRoot } from './paths.ts';

export type Pressure = 'normal' | 'soft' | 'hard' | 'critical';

export interface FilesystemUsage {
  path: string;
  totalBytes: number;
  freeBytes: number;
  usedPercent: number;
}

export interface CacheTarget {
  /** 相对仓库根的路径，用于展示与可复制清理预览。 */
  path: string;
  kind: 'dist' | 'vite-cache' | 'deps';
  /** 重建成本：低可随时回收，高只在高压下回收。 */
  rebuild: 'cheap' | 'moderate' | 'expensive';
  bytes: number;
  lastUsedMs: number;
  exists: boolean;
}

const TARGETS: { path: string; kind: CacheTarget['kind']; rebuild: CacheTarget['rebuild'] }[] = [
  { path: 'dist', kind: 'dist', rebuild: 'cheap' },
  { path: 'node_modules/.vite', kind: 'vite-cache', rebuild: 'moderate' },
  { path: 'node_modules', kind: 'deps', rebuild: 'expensive' },
];

export function filesystemUsage(path = repoRoot): FilesystemUsage {
  const stat = statfsSync(path);
  const totalBytes = stat.blocks * stat.bsize;
  const freeBytes = stat.bavail * stat.bsize;
  const usedPercent = totalBytes === 0 ? 0 : ((totalBytes - freeBytes) / totalBytes) * 100;
  return { path, totalBytes, freeBytes, usedPercent };
}

const LEVELS: Pressure[] = ['normal', 'soft', 'hard', 'critical'];

/**
 * 滞回：先按触发线算出当前级别；若先前级别更高，则只有跌破该级别的退出线才降级。
 * 这样 74–76% 附近抖动不会反复触发清理。
 */
export function pressureOf(usedPercent: number, policy: StoragePolicy, previous: Pressure): Pressure {
  const w = policy.watermarks;
  const triggers = [0, w.soft, w.hard, w.critical];
  const exits = [0, w.softExit, w.hardExit, w.criticalExit];

  let raw = 0;
  for (let level = 1; level < triggers.length; level += 1) {
    if (usedPercent >= (triggers[level] ?? 0)) raw = level;
  }

  const prevIndex = LEVELS.indexOf(previous);
  for (let level = prevIndex; level > raw; level -= 1) {
    if (usedPercent >= (exits[level] ?? 0)) return LEVELS[level] ?? 'normal';
  }
  return LEVELS[raw] ?? 'normal';
}

function directoryBytes(path: string, limit = 200_000): number {
  if (!existsSync(path)) return 0;
  let total = 0;
  let seen = 0;
  const stack = [path];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    let entries: Dirent[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      seen += 1;
      if (seen > limit) return total;
      const child = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(child);
      } else {
        try {
          total += statSync(child).size;
        } catch {
          /* 文件在统计期间被删除。 */
        }
      }
    }
  }
  return total;
}

export function scanCaches(): CacheTarget[] {
  return TARGETS.map((target) => {
    const absolute = join(repoRoot, target.path);
    const exists = existsSync(absolute);
    let bytes = 0;
    let lastUsedMs = 0;
    if (exists) {
      bytes = target.kind === 'deps' ? 0 : directoryBytes(absolute);
      try {
        lastUsedMs = statSync(absolute).mtimeMs;
      } catch {
        lastUsedMs = 0;
      }
    }
    return { ...target, bytes, lastUsedMs, exists };
  });
}

export interface CleanCandidate {
  path: string;
  kind: CacheTarget['kind'];
  bytes: number;
  reason: string;
  /** 受保护或跳过时的原因；有值即不删除。 */
  skip?: string;
}

export interface CleanPlan {
  pressure: Pressure;
  usage: FilesystemUsage;
  candidates: CleanCandidate[];
  reclaimBytes: number;
  policy: StoragePolicy;
}

function idleDaysOf(lastUsedMs: number, now: number): number {
  return lastUsedMs === 0 ? Number.POSITIVE_INFINITY : (now - lastUsedMs) / 86_400_000;
}

/**
 * 生成清理计划。只覆盖本仓库内、明确可重建的目录：
 * 源码、配置、.local 下的运行状态与日志（日志按轮转单独管理）都不在候选中。
 */
export function planClean(policy: StoragePolicy, pressure: Pressure, now = Date.now()): CleanPlan {
  const targets = scanCaches();
  const usage = filesystemUsage();
  const budgetBytes = policy.cacheBudgetMiB * 1024 * 1024;
  const overBudget = targets.reduce((sum, t) => sum + t.bytes, 0) > budgetBytes;

  const candidates: CleanCandidate[] = [];
  for (const target of targets) {
    if (!target.exists) continue;
    if (target.kind === 'deps') continue; // 依赖目录由安装器管理，不在此自动删除。
    const idle = idleDaysOf(target.lastUsedMs, now);
    const expired = idle > policy.idleDays;

    if (pressure === 'normal' && !expired && !overBudget) {
      candidates.push({
        path: target.path,
        kind: target.kind,
        bytes: target.bytes,
        reason: '可重建产物',
        skip: '空间充足且未过期，保留增量缓存',
      });
      continue;
    }

    const allowed =
      pressure === 'critical' ||
      (pressure === 'soft' && expired) ||
      (pressure === 'hard' && (expired || target.rebuild === 'cheap')) ||
      (pressure === 'normal' && expired) ||
      (pressure === 'normal' && overBudget);

    if (!allowed) {
      candidates.push({
        path: target.path,
        kind: target.kind,
        bytes: target.bytes,
        reason: '可重建产物',
        skip: '当前压力级别下重建成本不值得回收',
      });
      continue;
    }

    const reason =
      pressure === 'critical'
        ? '磁盘使用率已达临界，优先回收可重建产物'
        : expired
          ? `超过 ${policy.idleDays} 天未使用`
          : overBudget
            ? '超出项目缓存预算'
            : '磁盘压力偏高，回收低重建成本产物';
    candidates.push({ path: target.path, kind: target.kind, bytes: target.bytes, reason });
  }

  const reclaimBytes = candidates.reduce((sum, c) => sum + (c.skip ? 0 : c.bytes), 0);
  return { pressure, usage, candidates, reclaimBytes, policy };
}

export function executeClean(plan: CleanPlan): { removed: CleanCandidate[]; failed: string[] } {
  const removed: CleanCandidate[] = [];
  const failed: string[] = [];
  for (const candidate of plan.candidates) {
    if (candidate.skip) continue;
    const absolute = join(repoRoot, candidate.path);
    // 归属核验：路径必须落在仓库内，且仍是可重建目录本身。
    if (!absolute.startsWith(`${repoRoot}/`)) {
      failed.push(`${candidate.path}：路径越界，已跳过`);
      continue;
    }
    try {
      rmSync(absolute, { recursive: true, force: true });
      removed.push(candidate);
    } catch (error) {
      failed.push(`${candidate.path}：${(error as Error).message}`);
    }
  }
  return { removed, failed };
}

export interface CleanRecord {
  at: string;
  pressure: Pressure;
  reclaimBytes: number;
  paths: string[];
  failures: string[];
}

export function readCleanRecord(file: string): CleanRecord | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as CleanRecord;
  } catch {
    return null;
  }
}

export function writeCleanRecord(file: string, record: CleanRecord): void {
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '未知';
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
