import { createHash } from 'node:crypto';
import { repoName, repoRoot } from './paths.ts';

const IDENTITY_VERSION = 'mode:v1';

/** 稳定仓库身份：同一 checkout 重启不变，不同路径的 clone/worktree 分开。 */
export const repoKey = createHash('sha256')
  .update(`${IDENTITY_VERSION}\0${repoRoot}`)
  .digest('hex');

export const repoId = repoKey.slice(0, 12);

/** 资源键按 模式 + 资源类型 + 服务名 隔离，便于将来增加服务时互不干扰。 */
function resourceKey(kind: string, service: string): Buffer {
  return createHash('sha256')
    .update(`${repoKey}\0local\0${kind}\0${service}`)
    .digest();
}

/** 由仓库身份派生基线端口（不依赖当前时间或随机值）。 */
export function basePort(service: string, rangeStart: number, rangeSize: number): number {
  const digest = resourceKey('port', service);
  return rangeStart + (digest.readUInt32BE(0) % rangeSize);
}

export function displayName(): string {
  return `${repoName}-${repoId}`;
}
