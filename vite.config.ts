import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const pkg = JSON.parse(
  readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string };

const instanceId = process.env.MODE_INSTANCE_ID ?? 'dev';
const repoKey = process.env.MODE_REPO_KEY ?? 'unknown';
const hmrClientPort = Number(process.env.MODE_HMR_CLIENT_PORT ?? 0);

/**
 * 健康探针。管理器用 x-mode-instance 核对应答确实来自本次启动的进程，
 * 避免把其他项目在同一端口返回的 200 当成自己的服务。
 * 生产构建由网关做存活/就绪探测，不依赖该中间件。
 */
function probePlugin(): Plugin {
  return {
    name: 'mode-probe',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('x-mode-instance', instanceId);
        res.setHeader('x-mode-repo', repoKey);
        if (req.url?.startsWith('/__mode/health')) {
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('cache-control', 'no-store');
          res.end(
            JSON.stringify({
              ok: true,
              instanceId,
              repoKey,
              version: pkg.version,
              uptime: Math.round(process.uptime()),
            }),
          );
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), probePlugin()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    host: process.env.MODE_BIND_HOST ?? '127.0.0.1',
    port: Number(process.env.MODE_PORT ?? 5173),
    // 端口由管理器派生并先行占用；冲突时由管理器换下一个候选，而不是 Vite 静默顺延。
    strictPort: true,
    allowedHosts: true,
    ...(hmrClientPort > 0 ? { hmr: { clientPort: hmrClientPort } } : {}),
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
