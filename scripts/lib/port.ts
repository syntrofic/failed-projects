import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

export class PortExhaustedError extends Error {}

/**
 * 端口分配：从基线开始真实 bind，仅对端口占用做有界顺延。
 * 不用「探测空闲 → 关闭 → 再启动」的竞态做法；原占用进程不受影响。
 */
export async function canBind(port: number, host: string): Promise<boolean> {
  const server = createServer();
  server.unref();
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  server.once('error', reject);
  server.listen({ port, host, exclusive: true }, resolve);
  try {
    await promise;
    const address = server.address() as AddressInfo | null;
    return address?.port === port;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'EADDRINUSE' || code === 'EACCES' || code === 'EADDRNOTAVAIL') return false;
    throw error;
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

export async function pickPort(
  start: number,
  size: number,
  host: string,
  maxTries = 32,
): Promise<number> {
  const limit = Math.min(maxTries, size);
  for (let i = 0; i < limit; i += 1) {
    const candidate = start + i;
    if (await canBind(candidate, host)) return candidate;
  }
  throw new PortExhaustedError(
    `端口 ${start}–${start + limit - 1} 均被占用（已尝试 ${limit} 个候选）`,
  );
}
