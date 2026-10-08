import assert from 'node:assert/strict';
import net from 'node:net';
import test from 'node:test';
import { startBroker } from '../dist/broker/main.js';
import { startService } from '../dist/service/main.js';
import { createBrowserManager } from '../src/browser-manager.js';

const availablePort = async () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

const createRuntime = (onMcpCall = () => {}) => ({
  async perform() { return { url: 'about:blank' }; },
  async performMcp() { onMcpCall(); return { content: [{ type: 'text', text: 'ready' }] }; },
  async close() {},
});

const MCP_TOKEN = 'entrypoint-test-mcp-token';

test('broker startup fails before binding when the MCP bearer token is missing', async () => {
  await assert.rejects(startBroker({
    env: { OPENCHAMBER_BROWSER_API_PORT: 'not-a-port' },
    runtime: createRuntime(),
  }), /OPENCHAMBER_BROWSER_MCP_TOKEN is required/);
});

test('built broker entry starts both loopback listeners and reports readiness', async () => {
  const apiPort = await availablePort();
  let mcpPort = await availablePort();
  while (mcpPort === apiPort) mcpPort = await availablePort();
  let browserCalls = 0;
  const manager = createBrowserManager({ createRuntime: () => createRuntime(() => { browserCalls += 1; }) });
  const broker = await startBroker({
    env: {
      OPENCHAMBER_BROWSER_API_PORT: String(apiPort),
      OPENCHAMBER_BROWSER_MCP_PORT: String(mcpPort),
      OPENCHAMBER_BROWSER_MCP_TOKEN: MCP_TOKEN,
    },
    runtime: manager,
  });
  try {
    assert.deepEqual(broker.address, {
      api: { host: '127.0.0.1', port: apiPort },
      mcp: { host: '127.0.0.1', port: mcpPort },
    });
    const health = await fetch(`http://127.0.0.1:${mcpPort}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      ok: true, mcp: 'ready', protocolVersion: '2024-11-05', toolCount: 37,
    });

    const request = (message, token) => fetch(`http://127.0.0.1:${mcpPort}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(message),
    });
    const unauthorized = await request({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'browser_snapshot' } });
    const wrongToken = await request({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'browser_snapshot' } }, 'wrong-token');
    assert.equal(unauthorized.status, 401);
    assert.equal(wrongToken.status, 401);
    assert.equal(browserCalls, 0);

    const initialize = await request({ jsonrpc: '2.0', id: 3, method: 'initialize' }, MCP_TOKEN);
    const listed = await request({ jsonrpc: '2.0', id: 4, method: 'tools/list' }, MCP_TOKEN);
    const called = await request({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'browser_snapshot' } }, MCP_TOKEN);
    assert.equal((await initialize.json()).result.serverInfo.name, 'openchamber-agent-browser');
    assert.equal((await listed.json()).result.tools.length, 37);
    assert.deepEqual((await called.json()).result, { content: [{ type: 'text', text: 'ready' }] });
    assert.equal(browserCalls, 1);
    const privateHealth = await fetch(`http://127.0.0.1:${apiPort}/health`);
    assert.equal(privateHealth.status, 200);
  } finally {
    await broker.close();
  }
});

test('built guest service entry remains authenticated and binds loopback', async () => {
  const port = await availablePort();
  const service = await startService({
    env: { OPENCHAMBER_SERVICE_PORT: String(port), OPENCHAMBER_SERVICE_TOKEN: 'entrypoint-token' },
    runtime: createRuntime(),
  });
  try {
    assert.deepEqual(service.address, { host: '127.0.0.1', port });
    assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status, 401);
    assert.equal((await fetch(`http://127.0.0.1:${port}/health`, {
      headers: { authorization: 'Bearer entrypoint-token' },
    })).status, 200);
  } finally {
    await service.close();
  }
});
