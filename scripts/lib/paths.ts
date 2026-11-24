import { realpathSync } from 'node:fs';
import { join } from 'node:path';

/** 仓库根目录：脚本位于 <root>/scripts/lib，取真实路径以归一化符号链接。 */
export const repoRoot = realpathSync(join(import.meta.dirname, '..', '..'));

export const repoName = repoRoot.split('/').pop() ?? 'portal-website';

/** 本地配置与运行状态目录（.gitignore 中的 .local/）。 */
export const localDir = join(repoRoot, '.local');
export const configFile = join(localDir, 'mode.json');

/** 运行状态：PID、日志、锁。不写进配置。 */
export const runDir = join(localDir, 'run');
export const logDir = join(runDir, 'logs');
export const logFile = join(logDir, 'dev.log');
export const stateFile = join(runDir, 'state.json');
export const cleanReportFile = join(runDir, 'last-clean.json');
export const lockDir = join(runDir, 'mode.lock.d');

export const displayConfigPath = '.local/mode.json';
