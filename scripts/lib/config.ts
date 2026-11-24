import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { configFile, localDir, runDir } from './paths.ts';

export interface StoragePolicy {
  /** 使用率分级触发线（百分比），退出线必须低于触发线。 */
  watermarks: {
    soft: number;
    softExit: number;
    hard: number;
    hardExit: number;
    critical: number;
    criticalExit: number;
  };
  /** 本项目可重建缓存预算（MiB），作为水位之外的兜底。 */
  cacheBudgetMiB: number;
  /** 空闲多久（天）的可重建产物允许过期回收。 */
  idleDays: number;
  maxLogMiB: number;
  keepLogFiles: number;
}

export interface ModeConfig {
  version: 1;
  /** 当前运行方式；本项目只有 local 一种，保留字段以便将来扩展。 */
  mode: 'local';
  /** 监听范围：0.0.0.0 时同时提供局域网访问地址。 */
  bindHost: string;
  portRange: { start: number; size: number };
  storage: StoragePolicy;
}

const DEFAULTS: ModeConfig = {
  version: 1,
  mode: 'local',
  bindHost: '0.0.0.0',
  portRange: { start: 24000, size: 400 },
  storage: {
    watermarks: { soft: 75, softExit: 70, hard: 85, hardExit: 78, critical: 92, criticalExit: 85 },
    cacheBudgetMiB: 3072,
    idleDays: 14,
    maxLogMiB: 10,
    keepLogFiles: 3,
  },
};

export class ConfigError extends Error {}

function assertInteger(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new ConfigError(`${label} 必须是 ${min}–${max} 之间的整数`);
  }
  return value;
}

function validate(raw: unknown): ModeConfig {
  if (typeof raw !== 'object' || raw === null) throw new ConfigError('配置内容不是对象');
  const data = raw as Partial<ModeConfig>;
  if (data.version !== 1) throw new ConfigError(`不支持的配置版本：${String(data.version)}`);
  if (data.mode !== undefined && data.mode !== 'local') {
    throw new ConfigError(`不支持的运行方式：${String(data.mode)}`);
  }
  const bindHost = data.bindHost ?? DEFAULTS.bindHost;
  if (typeof bindHost !== 'string' || bindHost === '') throw new ConfigError('bindHost 不能为空');

  const portRange = { ...DEFAULTS.portRange, ...(data.portRange ?? {}) };
  const start = assertInteger(portRange.start, 'portRange.start', 1024, 65000);
  const size = assertInteger(portRange.size, 'portRange.size', 1, 2000);
  if (start + size > 65000) throw new ConfigError('portRange 超出 1024–65000');

  const storage = { ...DEFAULTS.storage, ...(data.storage ?? {}) };
  const w = { ...DEFAULTS.storage.watermarks, ...(storage.watermarks ?? {}) };
  for (const key of ['soft', 'softExit', 'hard', 'hardExit', 'critical', 'criticalExit'] as const) {
    assertInteger(w[key], `storage.watermarks.${key}`, 1, 99);
  }
  if (!(w.softExit < w.soft && w.soft <= w.hard)) {
    throw new ConfigError('水位需满足 softExit < soft ≤ hard');
  }
  if (!(w.hardExit < w.hard && w.hard <= w.critical)) {
    throw new ConfigError('水位需满足 hardExit < hard ≤ critical');
  }
  if (w.criticalExit >= w.critical) throw new ConfigError('水位需满足 criticalExit < critical');

  return {
    version: 1,
    mode: 'local',
    bindHost,
    portRange: { start, size },
    storage: {
      watermarks: w,
      cacheBudgetMiB: assertInteger(storage.cacheBudgetMiB, 'storage.cacheBudgetMiB', 64, 512000),
      idleDays: assertInteger(storage.idleDays, 'storage.idleDays', 1, 365),
      maxLogMiB: assertInteger(storage.maxLogMiB, 'storage.maxLogMiB', 1, 1024),
      keepLogFiles: assertInteger(storage.keepLogFiles, 'storage.keepLogFiles', 1, 20),
    },
  };
}

/** 读取配置；文件不存在时以默认值创建。损坏或版本不支持时报错，绝不静默重置。 */
export function loadConfig(): { config: ModeConfig; created: boolean } {
  mkdirSync(localDir, { recursive: true, mode: 0o700 });
  mkdirSync(runDir, { recursive: true, mode: 0o700 });
  let text: string;
  try {
    text = readFileSync(configFile, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    saveConfig(DEFAULTS);
    return { config: DEFAULTS, created: true };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ConfigError('.local/mode.json 不是合法 JSON，请修正或删除后重建');
  }
  return { config: validate(parsed), created: false };
}

/** 局部更新：保留其它字段，原子替换。调用方必须已持有仓库锁。 */
export function saveConfig(config: ModeConfig): void {
  mkdirSync(localDir, { recursive: true, mode: 0o700 });
  const tmp = `${configFile}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, configFile);
}

