const TIMEOUT_MS = 2000;

export interface HealthReport {
  ok: boolean;
  detail: string;
  version?: string | undefined;
  uptime?: number | undefined;
}

interface ProbeBody {
  ok?: boolean;
  instanceId?: string;
  repoKey?: string;
  version?: string;
  uptime?: number;
}

/**
 * 健康探测：只请求经核验实例记录的回环端口，禁止重定向，
 * 并比对 x-mode-instance 响应头与仓库标识，避免把其他项目返回的 200 判为成功。
 */
export async function probeHealth(
  port: number,
  expect: { instanceId: string; repoKey: string },
  host = '127.0.0.1',
): Promise<HealthReport> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`http://${host}:${port}/__mode/health`, {
      redirect: 'error',
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    const headerInstance = response.headers.get('x-mode-instance') ?? '';
    if (!response.ok) {
      return { ok: false, detail: `HTTP ${response.status}` };
    }
    if (headerInstance !== expect.instanceId) {
      return { ok: false, detail: '实例标识不匹配（端口可能被其他进程占用）' };
    }
    const body = (await response.json()) as ProbeBody;
    if (!body.ok || body.instanceId !== expect.instanceId) {
      return { ok: false, detail: '健康应答实例不符' };
    }
    if (body.repoKey !== expect.repoKey) {
      return { ok: false, detail: '健康应答仓库标识不符' };
    }
    return {
      ok: true,
      detail: '服务已就绪',
      version: body.version,
      uptime: body.uptime,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') return { ok: false, detail: '健康检查超时' };
    return { ok: false, detail: `无法连接：${(error as Error).message}` };
  } finally {
    clearTimeout(timer);
  }
}

/** 轮询至健康或超时；返回最后一次探测结果。 */
export async function waitHealthy(
  port: number,
  expect: { instanceId: string; repoKey: string },
  timeoutMs: number,
): Promise<HealthReport> {
  const deadline = Date.now() + timeoutMs;
  let last: HealthReport = { ok: false, detail: '尚未开始探测' };
  while (Date.now() < deadline) {
    last = await probeHealth(port, expect);
    if (last.ok) return last;
    await Bun.sleep(250);
  }
  return last;
}
