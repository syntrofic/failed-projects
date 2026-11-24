import { networkInterfaces } from 'node:os';

/** 首个非回环 IPv4 地址，用于展示局域网访问入口。 */
export function lanAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }
  return null;
}
