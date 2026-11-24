import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stateFile } from './paths.ts';
import { isSameProcess, readProcess, type ProcessRef } from './process.ts';

export interface RunState {
  version: 1;
  instanceId: string;
  repoKey: string;
  repoRoot: string;
  mode: 'local';
  pid: number;
  startTicks: string;
  argv: string[];
  port: number;
  bindHost: string;
  startedAt: string;
  command: string[];
  buildId: string;
}

export function readState(): RunState | null {
  if (!existsSync(stateFile)) return null;
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8')) as RunState;
  } catch {
    return null;
  }
}

export function writeState(state: RunState): void {
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

export function clearState(): void {
  rmSync(stateFile, { force: true });
}

export type Liveness =
  | { status: 'stopped'; reason: string }
  | { status: 'running'; state: RunState; ref: ProcessRef; pid: number };

/** 状态文件 + 进程身份双重校验：仅凭 PID 或仅凭文件都不足以认定在运行。 */
export function probeState(): Liveness {
  const state = readState();
  if (!state) return { status: 'stopped', reason: '未启动' };
  const ref: ProcessRef = { pid: state.pid, startTicks: state.startTicks, argv: state.argv };
  if (!isSameProcess(ref)) {
    return { status: 'stopped', reason: '身份校验未通过：进程已退出或 PID 被其他进程复用，未对其操作' };
  }
  const live = readProcess(state.pid);
  return { status: 'running', state, ref, pid: live?.pid ?? state.pid };
}
