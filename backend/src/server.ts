import { createServer } from 'node:http';

const host = process.env.HOST ?? '127.0.0.1';
const portValue = process.env.PORT ?? '3001';
const port = Number(portValue);

if (!/^\d+$/.test(portValue) || port > 65535) {
  throw new Error('PORT must be an integer between 0 and 65535.');
}

const server = createServer((request, response) => {
  const pathname = request.url?.split('?', 1)[0];
  const isHealthCheck =
    pathname === '/healthz' && (request.method === 'GET' || request.method === 'HEAD');

  response.writeHead(isHealthCheck ? 200 : 404, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(isHealthCheck ? '{"status":"ok"}\n' : '{"error":"Not found"}\n');
});

server.listen(port, host, () => {
  const address = server.address();
  if (address && typeof address === 'object') {
    console.log(`Website backend listening on ${address.address}:${address.port}`);
  }
});
