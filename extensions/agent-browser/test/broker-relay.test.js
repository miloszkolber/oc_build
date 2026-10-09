import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createBrokerClientRuntime } from '../src/broker-client.js';
import { createBrowserManager } from '../src/browser-manager.js';
import { createBrowserRuntime as createBrowserRuntimeImpl } from '../src/browser-runtime.js';
import { resolveChromePath } from '../src/chrome-process.js';
import { createMcpService } from '../src/mcp-service.js';
import { createService } from '../src/service.js';

const TOKEN = 'relay-test-service-token';
const AUTH = { authorization: `Bearer ${TOKEN}` };
const MCP_TOKEN = 'relay-test-mcp-token';
const MCP_AUTH = { authorization: `Bearer ${MCP_TOKEN}` };
const MODIFIERS = { alt: false, ctrl: false, meta: false, shift: false };
const createBrowserRuntime = (options) => createBrowserRuntimeImpl({
  ...options,
  ...(process.env.OPENCHAMBER_BROWSER_TEST_NO_SANDBOX === '1' ? { noSandbox: true } : {}),
});

const startService = async (service) => {
  const address = await service.listen();
  return { service, address, origin: `http://${address.host}:${address.port}` };
};

const closeAll = async (...services) => {
  await Promise.all(services.map((service) => service?.close().catch(() => {})));
};

const createFixtureRuntime = () => {
  let text = 'fixture ready';
  let url = 'about:blank';
  let sourceSequence = 0;
  const tabs = [{ id: 'fixture-tab', active: true, url, title: 'Fixture' }];
  const runtime = {
    tabs,
    get url() { return url; },
    get title() { return 'Fixture'; },
    get isLoading() { return false; },
    get canGoBack() { return false; },
    get canGoForward() { return false; },
    get viewportState() { return { mode: 'auto', source: 'viewer', width: 800, height: 600, mobile: false }; },
    async perform(action, parameters) {
      if (action === 'browser.open') {
        url = parameters.url;
        text = 'fixture ready';
        tabs[0].url = url;
      }
      return { opened: true, url, title: 'Fixture' };
    },
    async performMcp(name) {
      if (name !== 'browser_snapshot') throw new Error(`Unsupported fixture tool: ${name}`);
      return { content: [{ type: 'text', text: `URL: ${url}\n${text}` }] };
    },
    async command() {},
    async surfaceFrame({ after }) {
      const sequence = Math.max(sourceSequence + 1, after + 1);
      sourceSequence = sequence;
      return {
        sequence,
        bytes: Buffer.from(`${url}\n${text}`),
        mime: 'image/jpeg', width: 800, height: 600, title: 'Fixture',
        browserViewportMode: 'auto',
      };
    },
    async surfaceInput(events) {
      if (events.some((event) => event.type === 'text')) text += ` ${events.find((event) => event.type === 'text').text}`;
      if (events.some((event) => event.type === 'pointer')) text = 'fixture clicked';
    },
    async surfaceControl() {},
    async surfaceResize(size) { return size; },
    async surfaceClipboard() { return ''; },
    async setNativeSelectCompatibility() {},
    async close() {},
  };
  return runtime;
};

const startRelay = async (runtime) => {
  const manager = createBrowserManager({ createRuntime: () => runtime });
  const api = await startService(createService({ runtime: manager, allowUnauthenticated: true, port: 0 }));
  const mcp = await startService(createMcpService({ runtime: manager, token: MCP_TOKEN, port: 0 }));
  const guest = await startService(createService({
    runtime: createBrokerClientRuntime({ baseUrl: api.origin }), token: TOKEN, port: 0,
  }));
  return { manager, api, mcp, guest };
};

const providerOpen = (origin, url) => fetch(`${origin}/browser-control`, {
  method: 'POST', headers: { ...AUTH, 'content-type': 'application/json' },
  body: JSON.stringify({ requestId: 'relay-open', action: 'browser.open', parameters: { url }, context: null }),
});

const surfaceFrame = (origin, after = 0, wait = 0) => fetch(`${origin}/surface/frame?after=${after}&wait=${wait}`, { headers: AUTH });

const toolCall = (origin, name, args = {}) => fetch(`${origin}/mcp`, {
  method: 'POST', headers: { ...MCP_AUTH, 'content-type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
});

test('relays an authenticated surface through loopback to the one MCP browser owner', async (context) => {
  const runtime = createFixtureRuntime();
  const relay = await startRelay(runtime);
  context.after(() => closeAll(relay.guest.service, relay.mcp.service, relay.api.service));

  assert.deepEqual([relay.guest.address.host, relay.api.address.host, relay.mcp.address.host], [
    '127.0.0.1', '127.0.0.1', '127.0.0.1',
  ]);
  assert.equal((await providerOpen(relay.guest.origin, 'http://fixture.test/')).status, 200);
  const first = await surfaceFrame(relay.guest.origin);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'image/jpeg');
  assert.equal(first.headers.get('x-surface-seq'), '1');
  assert.equal(first.headers.get('x-browser-viewport-mode'), 'auto');
  assert.match(await first.text(), /fixture ready/);

  const input = await fetch(`${relay.guest.origin}/surface/input`, {
    method: 'POST',
    headers: { ...AUTH, 'content-type': 'application/json', 'x-surface-viewer': 'viewer-a', 'x-surface-frame-seq': '1' },
    body: JSON.stringify({ events: [
      { type: 'pointer', action: 'down', x: 20, y: 20, button: 0, buttons: 1, modifiers: MODIFIERS },
      { type: 'pointer', action: 'up', x: 20, y: 20, button: 0, buttons: 0, modifiers: MODIFIERS },
    ] }),
  });
  assert.equal(input.status, 204);
  const unauthenticated = await fetch(`${relay.guest.origin}/surface/frame?after=0&wait=0`);
  const handBack = await fetch(`${relay.guest.origin}/surface/control`, {
    method: 'POST', headers: { ...AUTH, 'content-type': 'application/json' },
    body: JSON.stringify({ controller: 'none' }),
  });
  const second = await surfaceFrame(relay.guest.origin, 1);
  const mcpSurfacePath = await fetch(`${relay.mcp.origin}/surface/frame?after=0&wait=0`);
  const snapshot = await toolCall(relay.mcp.origin, 'browser_snapshot');
  const snapshotResult = await snapshot.json();

  assert.equal(unauthenticated.status, 401);
  assert.equal(handBack.status, 204);
  assert.equal(second.status, 200);
  assert.equal(second.headers.get('x-surface-seq'), '2');
  assert.match(await second.text(), /fixture clicked/);
  assert.equal(mcpSurfacePath.status, 404);
  assert.match(snapshotResult.result.content[0].text, /fixture clicked/);
});

test('preserves a stale-frame conflict across the broker-to-guest relay', async (context) => {
  const runtime = createBrokerClientRuntime({
    baseUrl: 'http://127.0.0.1:3001',
    fetchImpl: async () => new Response(JSON.stringify({ error: 'The browser view changed before this input arrived' }), {
      status: 409,
      headers: { 'content-type': 'application/json' },
    }),
  });
  const guest = await startService(createService({ runtime, token: TOKEN, port: 0 }));
  context.after(() => guest.service.close());

  const response = await fetch(`${guest.origin}/surface/input`, {
    method: 'POST',
    headers: { ...AUTH, 'content-type': 'application/json' },
    body: JSON.stringify({ events: [{ type: 'text', text: 'stale' }] }),
  });
  assert.equal(response.status, 409);
});

let chromePath = null;
try { chromePath = resolveChromePath(); } catch {}

test('relays Chromium frames and input to the same live page MCP snapshots', {
  skip: chromePath ? false : 'Chrome or Chromium is unavailable',
  timeout: 60_000,
}, async (context) => {
  const web = http.createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><title>Relay fixture</title><button style="position:absolute;left:8px;top:8px;width:150px;height:50px" onclick="document.querySelector('#result').textContent='clicked through surface'">Click fixture</button><p id="result" style="position:absolute;left:8px;top:80px">before input</p>`);
  });
  await new Promise((resolve, reject) => {
    web.once('error', reject);
    web.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${web.address().port}`;
  const runtime = createBrowserRuntime({ chromePath, allowedOrigins: [origin] });
  const manager = createBrowserManager({ createRuntime: () => runtime });
  const api = await startService(createService({ runtime: manager, allowUnauthenticated: true, port: 0 }));
  const mcp = await startService(createMcpService({ runtime: manager, token: MCP_TOKEN, port: 0 }));
  const guest = await startService(createService({ runtime: createBrokerClientRuntime({ baseUrl: api.origin }), token: TOKEN, port: 0 }));
  context.after(async () => {
    await closeAll(guest.service, mcp.service, api.service);
    await new Promise((resolve) => web.close(resolve));
  });

  assert.deepEqual([guest.address.host, api.address.host, mcp.address.host], ['127.0.0.1', '127.0.0.1', '127.0.0.1']);
  const opened = await providerOpen(guest.origin, `${origin}/`);
  const openedBody = await opened.json();
  assert.equal(openedBody.ok, true);
  assert.equal(openedBody.data.url, `${origin}/`);
  const first = await surfaceFrame(guest.origin, 0, 3_000);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'image/jpeg');
  assert.ok((await first.arrayBuffer()).byteLength > 100);

  const input = await fetch(`${guest.origin}/surface/input`, {
    method: 'POST',
    headers: { ...AUTH, 'content-type': 'application/json', 'x-surface-viewer': 'viewer-a', 'x-surface-frame-seq': first.headers.get('x-surface-seq') },
    body: JSON.stringify({ events: [
      { type: 'pointer', action: 'down', x: 30, y: 30, button: 0, buttons: 1, modifiers: MODIFIERS },
      { type: 'pointer', action: 'up', x: 30, y: 30, button: 0, buttons: 0, modifiers: MODIFIERS },
    ] }),
  });
  assert.equal(input.status, 204);
  const handBack = await fetch(`${guest.origin}/surface/control`, {
    method: 'POST', headers: { ...AUTH, 'content-type': 'application/json' },
    body: JSON.stringify({ controller: 'none' }),
  });
  assert.equal(handBack.status, 204);
  const result = await (await toolCall(mcp.origin, 'browser_snapshot')).json();
  assert.match(result.result.content[0].text, /clicked through surface/);
  assert.equal((await fetch(`${mcp.origin}/surface/frame?after=0&wait=0`)).status, 404);
});
