import type { ModeConfig } from './config.ts';
import { cleanReportFile } from './paths.ts';
import {
  executeClean,
  filesystemUsage,
  formatBytes,
  planClean,
  pressureOf,
  readCleanRecord,
  writeCleanRecord,
  type CleanRecord,
  type Pressure,
} from './storage.ts';
import { readRuntime, writeRuntime } from './runtime.ts';

const PRESSURE_LABEL: Record<Pressure, string> = {
  normal: '正常',
  soft: '偏高',
  hard: '紧张',
  critical: '临界',
};

export interface SpaceCheck {
  blocked: boolean;
  usagePercent: number;
  pressureLabel: string;
  reclaimLabel: string;
  cleanReport: string[] | null;
  record: CleanRecord | null;
}

/** 构建前空间检查：仅在压力或过期触发时清理可重建产物，并回报实际结果。 */
export function checkSpaceBeforeBuild(config: ModeConfig): SpaceCheck {
  const runtime = readRuntime();
  const usage = filesystemUsage();
  const pressure = pressureOf(usage.usedPercent, config.storage, runtime.pressure);
  const plan = planClean(config.storage, pressure);

  const check: SpaceCheck = {
    blocked: pressure === 'critical' && plan.reclaimBytes < 64 * 1024 * 1024,
    usagePercent: usage.usedPercent,
    pressureLabel: PRESSURE_LABEL[pressure],
    reclaimLabel: pressure === 'normal' ? '无需回收' : formatBytes(plan.reclaimBytes),
    cleanReport: null,
    record: null,
  };

  writeRuntime({ ...runtime, pressure });

  const affected = plan.candidates.filter((candidate) => !candidate.skip);
  if (affected.length === 0) return check;

  const { removed, failed } = executeClean(plan);
  if (removed.length === 0 && failed.length === 0) return check;

  const record: CleanRecord = {
    at: new Date().toISOString(),
    pressure,
    reclaimBytes: removed.reduce((sum, candidate) => sum + candidate.bytes, 0),
    paths: removed.map((candidate) => candidate.path),
    failures: failed,
  };
  writeCleanRecord(cleanReportFile, record);

  check.record = record;
  check.cleanReport = [
    `已回收 ${removed.length} 项可重建产物 · ${formatBytes(record.reclaimBytes)}`,
    ...removed.map((candidate) => `${candidate.path} · ${formatBytes(candidate.bytes)} · ${candidate.reason}`),
    ...failed.map((failure) => `未清理：${failure}`),
  ];
  return check;
}

export function currentPressure(config: ModeConfig): { pressure: Pressure; label: string } {
  const runtime = readRuntime();
  const usage = filesystemUsage();
  const pressure = pressureOf(usage.usedPercent, config.storage, runtime.pressure);
  return { pressure, label: PRESSURE_LABEL[pressure] };
}

export function lastCleanRecord(): CleanRecord | null {
  return readCleanRecord(cleanReportFile);
}

export { PRESSURE_LABEL };
