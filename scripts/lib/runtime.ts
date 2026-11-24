import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runDir } from './paths.ts';
import type { Pressure } from './storage.ts';

/** 运行状态（不属于用户配置）：压力级别的滞回历史、最近一次采样时间。 */
export interface RuntimeState {
  pressure: Pressure;
  sampledAt: string | null;
}

const FILE = join(runDir, 'runtime.json');

export function readRuntime(): RuntimeState {
  try {
    return JSON.parse(readFileSync(FILE, 'utf8')) as RuntimeState;
  } catch {
    return { pressure: 'normal', sampledAt: null };
  }
}

export function writeRuntime(state: RuntimeState): void {
  if (!existsSync(runDir)) return;
  writeFileSync(
    FILE,
    `${JSON.stringify({ ...state, sampledAt: new Date().toISOString() }, null, 2)}\n`,
    { mode: 0o600 },
  );
}
