import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { MCP_TOOLS } from './mcp-tools.js';

const PROTOCOL_VERSION = '2024-11-05';
const BODY_MAX_BYTES = 2 * 1024 * 1024;

const json = (response, status, value, headers = {}) => {
  const bytes = Buffer.from(JSON.stringify(value));
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': bytes.length,
    'cache-control': 'no-store',
    ...headers,
  });
  response.end(bytes);
};

const readBody = async (request) => {
  const length = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(length) && length > BODY_MAX_BYTES) throw Object.assign(new Error('MCP request body is too large'), { status: 413 });
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_MAX_BYTES) throw Object.assign(new Error('MCP request body is too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size).toString('utf8');
};

const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const rpcResult = (id, result) => ({ jsonrpc: '2.0', id, result });
const hasId = (value) => Object.hasOwn(value, 'id') && (typeof value.id === 'string' || Number.isSafeInteger(value.id));
const isAuthorized = (request, token) => {
  const authorization = request.headers.authorization;
  if (typeof authorization !== 'string') return false;
  const actual = Buffer.from(authorization, 'utf8');
  const expected = Buffer.from(`Bearer ${token}`, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

const initializeResult = (requestedVersion) => ({
  protocolVersion: requestedVersion === PROTOCOL_VERSION ? requestedVersion : PROTOCOL_VERSION,
  capabilities: { tools: { listChanged: false } },
  serverInfo: { name: 'browser', version: '1.1.0' },
  instructions: 'These tools control standalone Chromium, not OpenChamber native Preview, terminal, sessions or worktrees. Tabs, cookies and login state are separate from OpenChamber; MCP pages do not automatically appear in its desktop UI. Report evidence as verified in MCP Chromium, not verified in OpenChamber desktop UI unless that UI was checked directly. Archived Agent Browser extension instructions do not apply.',
});

export const createMcpService = ({ runtime, token, port = 3000, apiReady = () => true } = {}) => {
  if (typeof runtime?.performMcp !== 'function') throw new Error('createMcpService requires the standalone browser manager');
  if (typeof token !== 'string' || token.trim().length === 0) throw new Error('MCP bearer token is required');
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error('MCP port must be from 0 to 65535');
  const activeRequests = new Set();
  let listening = false;
  let closePromise = null;

  const dispatch = async (request, response, signal) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (request.method === 'GET' && url.pathname === '/health') {
      const ready = apiReady() === true;
      return json(response, ready ? 200 : 503, {
        ok: ready,
        mcp: ready ? 'ready' : 'broker-api-unavailable',
        protocolVersion: PROTOCOL_VERSION,
        toolCount: MCP_TOOLS.length,
      });
    }
    if (url.pathname !== '/mcp') {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return response.end('Not found\n');
    }
    if (!isAuthorized(request, token)) {
      response.writeHead(401, {
        'www-authenticate': 'Bearer',
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      });
      return response.end('Unauthorized\n');
    }
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' });
      return response.end('MCP endpoint requires POST\n');
    }

    let message;
    try { message = JSON.parse(await readBody(request)); }
    catch (error) {
      if (error?.status) {
        response.writeHead(error.status, { 'content-type': 'text/plain; charset=utf-8' });
        return response.end(`${error.message}\n`);
      }
      return json(response, 200, rpcError(null, -32700, 'Parse error'));
    }
    if (!message || typeof message !== 'object' || Array.isArray(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
      return json(response, 200, rpcError(message?.id ?? null, -32600, 'Invalid Request'));
    }
    const isNotification = !Object.hasOwn(message, 'id');
    if (isNotification) {
      // MCP notifications have no JSON-RPC response. In particular,
      // notifications/initialized must not race the next client request.
      response.writeHead(202, { 'cache-control': 'no-store' });
      return response.end();
    }
    if (!hasId(message)) return json(response, 200, rpcError(null, -32600, 'Invalid Request id'));

    try {
      const params = message.params && typeof message.params === 'object' && !Array.isArray(message.params) ? message.params : {};
      if (message.method === 'initialize') {
        return json(response, 200, rpcResult(message.id, initializeResult(params.protocolVersion)));
      }
      if (message.method === 'ping') return json(response, 200, rpcResult(message.id, {}));
      if (message.method === 'tools/list') return json(response, 200, rpcResult(message.id, { tools: MCP_TOOLS }));
      if (message.method === 'resources/list') return json(response, 200, rpcResult(message.id, { resources: [] }));
      if (message.method === 'prompts/list') return json(response, 200, rpcResult(message.id, { prompts: [] }));
      if (message.method === 'tools/call') {
        if (typeof params.name !== 'string') return json(response, 200, rpcError(message.id, -32602, 'Missing tool name'));
        if (apiReady() !== true) {
          return json(response, 200, rpcResult(message.id, {
            content: [{ type: 'text', text: 'The browser service is unavailable.' }],
            isError: true,
          }));
        }
        try {
          const result = await runtime.performMcp(params.name, params.arguments ?? {}, signal);
          return json(response, 200, rpcResult(message.id, result));
        } catch (error) {
          const text = error instanceof Error && error.message.trim() ? error.message : 'Browser tool failed';
          return json(response, 200, rpcResult(message.id, { content: [{ type: 'text', text }], isError: true }));
        }
      }
      return json(response, 200, rpcError(message.id, -32601, `Method not found: ${message.method}`));
    } catch (error) {
      return json(response, 200, rpcError(message.id, -32603, error instanceof Error ? error.message : 'Internal error'));
    }
  };

  const server = http.createServer((request, response) => {
    const controller = new AbortController();
    activeRequests.add(controller);
    request.once('aborted', () => controller.abort(new DOMException('MCP request aborted', 'AbortError')));
    response.once('close', () => {
      activeRequests.delete(controller);
      if (!response.writableEnded) controller.abort(new DOMException('MCP client disconnected', 'AbortError'));
    });
    void dispatch(request, response, controller.signal).catch((error) => {
      activeRequests.delete(controller);
      if (!response.headersSent) json(response, 500, rpcError(null, -32603, error instanceof Error ? error.message : 'Internal error'));
      else response.destroy();
    });
  });

  return {
    async listen() {
      if (listening) return this.address;
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
      });
      listening = true;
      return this.address;
    },
    get address() {
      const value = server.address();
      return value && typeof value === 'object' ? { host: '127.0.0.1', port: value.port } : null;
    },
    close() {
      if (closePromise) return closePromise;
      closePromise = (async () => {
        for (const controller of activeRequests) controller.abort(new DOMException('MCP server stopped', 'AbortError'));
        if (listening) {
          const closed = new Promise((resolve) => server.close(resolve));
          server.closeAllConnections?.();
          await closed;
        }
        listening = false;
      })();
      return closePromise;
    },
  };
};
