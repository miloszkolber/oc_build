import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createStore, StoreError } from './store.js';
import { errorMessage } from './catalog.js';

export async function startService({ token = process.env.OPENCHAMBER_SERVICE_TOKEN, port = Number(process.env.OPENCHAMBER_SERVICE_PORT), store = createStore() } = {}) {
  if (!token || !Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Service token and port required');
  const server = http.createServer(async (request, response) => {
    const reply = (status, data) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(data)); };
    const supplied = Buffer.from(request.headers.authorization ?? ''), wanted = Buffer.from(`Bearer ${token}`);
    if (supplied.length !== wanted.length || !timingSafeEqual(supplied, wanted)) { reply(401, { error: 'Unauthorized' }); return; }
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/health') { reply(200, { ok: true }); return; }
      const match = /^\/artifacts(?:\/([^/]+))?$/.exec(url.pathname);
      if (!match) throw new StoreError('Not found', 404);
      const id = match[1] ? decodeURIComponent(match[1]) : null;
      const expected = url.searchParams.get('revision');
      let body = '';
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        let bytes = 0; const chunks = [];
        for await (const chunk of request) { bytes += chunk.length; if (bytes > 64000) throw new StoreError('Request too large', 413); chunks.push(chunk); }
        body = Buffer.concat(chunks).toString('utf8');
      }
      let result;
      if (request.method === 'GET') result = id ? await store.read(id) : { items: await store.list() };
      else if (request.method === 'POST' && !id) result = await store.create(JSON.parse(body));
      else if (request.method === 'PUT' && id) result = await store.update(id, JSON.parse(body), expected);
      else if (request.method === 'PATCH' && id) result = await store.rename(id, JSON.parse(body).title, expected);
      else if (request.method === 'DELETE' && id) result = await store.remove(id, expected);
      else throw new StoreError('Unsupported operation', 405);
      reply(200, result);
    } catch (error) { reply(error.status ?? 400, { error: errorMessage(error) }); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startService().then(server => {
    const stop = () => server.close(() => process.exit(0));
    process.once('SIGTERM', stop); process.once('SIGINT', stop);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
