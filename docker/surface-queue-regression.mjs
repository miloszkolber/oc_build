import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root = process.env.SURFACE_TEST_ROOT ?? '/opt/openchamber';
const require = createRequire(`${root}/package.json`);
const WebSocket = require('ws');
const { createGuestSurfaceRuntime } = await import(pathToFileURL(`${root}/server/lib/guests/surface.js`));
const modifiers = { alt: false, ctrl: false, meta: false, shift: false };
const wheel = { type: 'wheel', x: 10, y: 10, deltaX: 0, deltaY: 10, modifiers };
const key = { type: 'key', action: 'down', key: 'a', code: 'KeyA', modifiers };
const waitFor = async (predicate) => {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await new Promise(r => setTimeout(r, 5)); }
  throw new Error('Surface queue did not settle');
};
const harness = async () => {
  const server = http.createServer();
  const calls = [];
  let unblock;
  const gate = new Promise(r => { unblock = r; });
  let first = true;
  const runtime = createGuestSurfaceRuntime({
    server, uiAuthController: null, isRequestOriginAllowed: async () => true,
    rejectWebSocketUpgrade: socket => socket.destroy(), persistPath: '/unused', idleStopMs: 60000,
    findGuest: async () => ({ id: 'sim', name: 'Sim', enabled: true, packageRoot: '/unused', capabilityGrants: ['service'], service: { entry: 'service/main.js', runtime: 'host', surface: true } }),
    holdService: () => () => {},
    openServiceRequest: async ({ path, body, signal }) => {
      if (path === '/surface/frame') {
        await new Promise(r => signal.addEventListener('abort', r, { once: true }));
        throw new Error('Cancelled');
      }
      if (path === '/surface/input') {
        calls.push(JSON.parse(body).events);
        if (first) { first = false; await gate; }
      }
      return { response: new Response(null, { status: 204 }), finished() {} };
    },
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}/api/guests/sim/surface/ws`);
  await new Promise((r,j) => { ws.once('open',r);ws.once('error',j); });
  const send = events => ws.send(JSON.stringify({ type: 'input', events }));
  return { calls, runtime, ws, send, unblock, close: async () => { unblock(); runtime.stop(); ws.terminate(); await new Promise(r => server.close(r)); } };
};
test('queued scroll batches preserve distance and do not cross key barriers', async () => {
  const h = await harness();
  try {
    h.send([key]); await waitFor(() => h.calls.length === 1);
    for (let i = 0; i < 60; i++) h.send([wheel]);
    h.send([key]);
    for (let i = 0; i < 10; i++) h.send([wheel]);
    await waitFor(() => h.runtime.sessionOf('sim')?.viewers.values().next().value.pendingWheelBatch?.events[0]?.deltaY === 100);
    h.unblock(); await waitFor(() => h.calls.length === 4);
    assert.deepEqual(h.calls.map(events => events[0].type), ['key', 'wheel', 'key', 'wheel']);
    assert.equal(h.calls[1][0].deltaY, 600);
    assert.equal(h.calls[3][0].deltaY, 100);
  } finally { await h.close(); }
});
test('hand-back drops previously queued scroll without reacquiring control', async () => {
  const h = await harness();
  try {
    h.send([key]); await waitFor(() => h.calls.length === 1);
    for (let i = 0; i < 60; i++) h.send([wheel]);
    h.ws.send(JSON.stringify({ type: 'release' }));
    await waitFor(() => !h.runtime.userControls('sim'));
    h.unblock(); await h.runtime.sessionOf('sim').queue;
    assert.equal(h.calls.length, 1);
    assert.equal(h.runtime.userControls('sim'), false);
  } finally { await h.close(); }
});
