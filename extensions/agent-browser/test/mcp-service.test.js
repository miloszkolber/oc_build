import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { MCP_TOOLS } from '../src/mcp-tools.js';
import { createMcpService } from '../src/mcp-service.js';

const EXPECTED_CONTRACT = JSON.parse(await readFile(new URL('./fixtures/obscura-v0.2.4-tools.json', import.meta.url), 'utf8'));
const withoutDescriptions = (value) => Array.isArray(value)
  ? value.map(withoutDescriptions)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'description').map(([key, item]) => [key, withoutDescriptions(item)]))
    : value;
const canonical = (value) => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;

const TEST_TOKEN = 'mcp-service-test-token';

const start = async (runtime, options) => {
  const service = createMcpService({ runtime, token: TEST_TOKEN, port: 0, ...options });
  const address = await service.listen();
  return { service, origin: `http://${address.host}:${address.port}`, address };
};

const post = (origin, message, signal, token = TEST_TOKEN) => {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  return fetch(`${origin}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
    ...(signal ? { signal } : {}),
  });
};

test('requires a bearer token and rejects unauthorized MCP operations before browser dispatch', async (context) => {
  assert.throws(() => createMcpService({ runtime: { async performMcp() {} } }), /MCP bearer token is required/);
  assert.throws(() => createMcpService({ runtime: { async performMcp() {} }, token: '  ' }), /MCP bearer token is required/);

  let calls = 0;
  const fixture = await start({ async performMcp() { calls += 1; return { content: [] }; } });
  context.after(() => fixture.service.close());
  const operations = [
    { jsonrpc: '2.0', id: 1, method: 'initialize' },
    { jsonrpc: '2.0', id: 2, method: 'ping' },
    { jsonrpc: '2.0', id: 3, method: 'tools/list' },
    { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'browser_snapshot' } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
  ];

  for (const message of operations) {
    const response = await post(fixture.origin, message, undefined, null);
    assert.equal(response.status, 401);
  }
  const wrongToken = await post(fixture.origin, operations[3], undefined, 'wrong-token');
  assert.equal(wrongToken.status, 401);
  const unauthorizedMethod = await fetch(`${fixture.origin}/mcp`);
  assert.equal(unauthorizedMethod.status, 401);
  assert.equal(calls, 0);
});

test('advertises the complete fixed MCP tool contract and loopback health', async (context) => {
  const fixture = await start({ async performMcp() { return { content: [] }; } });
  context.after(() => fixture.service.close());

  const health = await fetch(`${fixture.origin}/health`);
  const initialized = await post(fixture.origin, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'fixture', version: '1' } },
  });
  const listed = await post(fixture.origin, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const notification = await post(fixture.origin, { jsonrpc: '2.0', method: 'notifications/initialized' });
  const methods = await Promise.all(['ping', 'resources/list', 'prompts/list'].map((method, index) => (
    post(fixture.origin, { jsonrpc: '2.0', id: index + 3, method })
  )));

  assert.deepEqual(fixture.address, { host: '127.0.0.1', port: fixture.address.port });
  assert.deepEqual(await health.json(), { ok: true, mcp: 'ready', protocolVersion: '2024-11-05', toolCount: 37 });
  assert.deepEqual((await initialized.json()).result.protocolVersion, '2024-11-05');
  const tools = (await listed.json()).result.tools;
  assert.equal(EXPECTED_CONTRACT.tools.length, 37);
  assert.deepEqual(canonical(withoutDescriptions(tools)), canonical(EXPECTED_CONTRACT.tools));
  assert.deepEqual(tools.map(({ name }) => name), EXPECTED_CONTRACT.tools.map(({ name }) => name));
  assert.deepEqual(tools.map(({ name }) => name), MCP_TOOLS.map(({ name }) => name));
  assert.ok(tools.every(({ inputSchema }) => inputSchema?.type === 'object'));
  assert.equal(notification.status, 202);
  assert.equal(await notification.text(), '');
  assert.deepEqual(await Promise.all(methods.map(async (response) => (await response.json()).result)), [
    {}, { resources: [] }, { prompts: [] },
  ]);
});

test('dispatches tool calls, reports tool failures, and handles malformed or unknown RPC requests', async (context) => {
  const calls = [];
  const fixture = await start({
    async performMcp(name, args, signal) {
      calls.push([name, args, signal instanceof AbortSignal]);
      if (name === 'browser_fail') throw new Error('fixture failure');
      return { content: [{ type: 'text', text: `${name}:${JSON.stringify(args)}` }] };
    },
  });
  context.after(() => fixture.service.close());

  const ok = await post(fixture.origin, {
    jsonrpc: '2.0', id: 'tool-1', method: 'tools/call',
    params: { name: 'browser_snapshot', arguments: { max_chars: 42 } },
  });
  const failed = await post(fixture.origin, {
    jsonrpc: '2.0', id: 'tool-2', method: 'tools/call', params: { name: 'browser_fail' },
  });
  const unknown = await post(fixture.origin, { jsonrpc: '2.0', id: 3, method: 'missing/method' });
  const parseError = await fetch(`${fixture.origin}/mcp`, {
    method: 'POST', headers: { authorization: `Bearer ${TEST_TOKEN}` }, body: '{',
  });
  const badRequest = await post(fixture.origin, { jsonrpc: '1.0', id: 4, method: 'ping' });
  const absent = await fetch(`${fixture.origin}/not-mcp`);
  const wrongMethod = await fetch(`${fixture.origin}/mcp`, { headers: { authorization: `Bearer ${TEST_TOKEN}` } });

  assert.deepEqual((await ok.json()).result, { content: [{ type: 'text', text: 'browser_snapshot:{"max_chars":42}' }] });
  assert.deepEqual((await failed.json()).result, { content: [{ type: 'text', text: 'fixture failure' }], isError: true });
  assert.equal((await unknown.json()).error.code, -32601);
  assert.equal((await parseError.json()).error.code, -32700);
  assert.equal((await badRequest.json()).error.code, -32600);
  assert.equal(absent.status, 404);
  assert.equal(wrongMethod.status, 405);
  assert.deepEqual(calls.map(([name, args, signal]) => [name, args, signal]), [
    ['browser_snapshot', { max_chars: 42 }, true],
    ['browser_fail', {}, true],
  ]);
});

test('reports an unavailable private broker through health without dispatching browser work', async (context) => {
  let calls = 0;
  const fixture = await start({ async performMcp() { calls += 1; return { content: [] }; } }, { apiReady: () => false });
  context.after(() => fixture.service.close());

  const health = await fetch(`${fixture.origin}/health`);
  const call = await post(fixture.origin, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'browser_snapshot' } });

  assert.equal(health.status, 503);
  assert.deepEqual(await health.json(), { ok: false, mcp: 'broker-api-unavailable', protocolVersion: '2024-11-05', toolCount: 37 });
  assert.equal((await call.json()).result.isError, true);
  assert.equal(calls, 0);
});

test('cancels an in-flight browser tool when its MCP client disconnects', async (context) => {
  const started = Promise.withResolvers();
  const aborted = Promise.withResolvers();
  const fixture = await start({
    performMcp(_name, _args, signal) {
      started.resolve();
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          aborted.resolve();
          reject(signal.reason);
        }, { once: true });
      });
    },
  });
  context.after(() => fixture.service.close());
  const controller = new AbortController();
  const pending = post(fixture.origin, {
    jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'browser_snapshot' },
  }, controller.signal);

  await started.promise;
  controller.abort();
  await assert.rejects(pending);
  await aborted.promise;
});
