#!/usr/bin/env bun
/**
 * 门户网站本地开发管理器。
 *
 * 单一运行方式（local）：Vite 开发服务器 + HMR，HTTP 仅监听本机/局域网，
 * TLS 由外围网关终止，本进程不生成也不加载证书。
 *
 * 入口：bun run mode:<命令>，实现见 scripts/lib/*。
 */
import { runCli } from './lib/cli.ts';

const code = await runCli(process.argv.slice(2));
process.exit(code);
