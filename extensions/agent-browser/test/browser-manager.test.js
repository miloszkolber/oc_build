import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserManager } from '../src/browser-manager.js';

const createRuntimeFactory = () => {
  const runtimes = [];
  const factory = () => {
    const calls = [];
    const deathListeners = new Set();
    const tabListeners = new Set();
    const navigationListeners = new Set();
    let activeTabId = null;
    let url = 'about:blank';
    let title = '';
    let frameSequence = 0;
    let nativeSelectCompatibility = false;
    const tabs = [];
    const notifyTabs = () => { for (const listener of tabListeners) listener(); };
    const notifyNavigation = () => { for (const listener of navigationListeners) listener(); };
    const runtime = {
      calls,
      get activeTabId() { return activeTabId; },
      get tabs() { return tabs.map((tab) => ({ ...tab, active: tab.id === activeTabId })); },
      get url() { return url; },
      get title() { return title; },
      get agentActive() { return false; },
      get nativeSelectCompatibility() { return nativeSelectCompatibility; },
      get nativeSelectCompatibilityError() { return ''; },
      get viewportState() { return { mode: 'auto', source: 'viewer', width: 800, height: 600, mobile: false }; },
      get problemCounts() { return { errors: 0, warnings: 0 }; },
      async perform(action, parameters) {
        calls.push(['perform', action, parameters]);
        if (action === 'browser.open') {
          url = parameters.url;
          title = 'Page';
          if (!tabs.length) tabs.push({ id: 'tab-1', url, title });
          else tabs[0] = { ...tabs[0], url, title };
          activeTabId = tabs[0].id;
          notifyTabs();
          notifyNavigation();
        }
        return { action, url, title };
      },
      async performMcp(name, parameters) {
        calls.push(['performMcp', name, parameters]);
        return { content: [{ type: 'text', text: `${name} ${url}` }] };
      },
      async command(name, parameters) {
        calls.push(['command', name, parameters]);
        if (name === 'navigate') { url = parameters.url; notifyNavigation(); }
        if (name === 'tab-new') {
          const id = `tab-${tabs.length + 1}`;
          tabs.push({ id, url: 'about:blank', title: '' });
          activeTabId = id;
          url = 'about:blank';
          title = '';
          notifyTabs();
        } else if (name === 'tab-select') {
          const tab = tabs.find(({ id }) => id === parameters.tabId);
          if (!tab) throw new Error('That tab is no longer open');
          activeTabId = tab.id;
          url = tab.url;
          title = tab.title;
          notifyTabs();
        } else if (name === 'tab-close') {
          const index = tabs.findIndex(({ id }) => id === parameters.tabId);
          if (index < 0) throw new Error('That tab is no longer open');
          tabs.splice(index, 1);
          activeTabId = tabs.at(-1)?.id ?? null;
          url = tabs.at(-1)?.url ?? 'about:blank';
          title = tabs.at(-1)?.title ?? '';
          notifyTabs();
        }
      },
      async configureViewport(request) { calls.push(['viewport', request]); },
      async surfaceFrame({ after }) {
        calls.push(['frame', after]);
        frameSequence = Math.max(frameSequence + 1, after + 1);
        return { sequence: frameSequence, bytes: Buffer.from(url), mime: 'image/jpeg', width: 800, height: 600, title };
      },
      async surfaceInput(events, theme) { calls.push(['input', events, theme]); },
      surfaceControl(controller) { calls.push(['control', controller]); },
      async surfaceResize(size) { calls.push(['resize', size]); return size; },
      async surfaceClipboard() { return 'copied'; },
      async setNativeSelectCompatibility(enabled) {
        calls.push(['select-compatibility', enabled]);
        nativeSelectCompatibility = enabled;
      },
      async close() { calls.push(['close']); },
      onDead(listener) { deathListeners.add(listener); return () => deathListeners.delete(listener); },
      onTabsChanged(listener) { tabListeners.add(listener); return () => tabListeners.delete(listener); },
      onNavigationChanged(listener) { navigationListeners.add(listener); return () => navigationListeners.delete(listener); },
      die() { for (const listener of deathListeners) listener(new Error('Chromium exited')); },
    };
    runtimes.push(runtime);
    return runtime;
  };
  return { factory, runtimes };
};

const managerFor = (factory) => createBrowserManager({ createRuntime: factory });

test('idle expiry clears the profile and control lease; viewing keeps it alive', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  let clock = 0;
  const manager = createBrowserManager({ createRuntime: factory, now: () => clock });
  await manager.perform('browser.open', { url: 'https://one.test' });
  clock = 59_999;
  assert.equal(await manager.expireIdle(60_000), false);
  await manager.surfaceFrame({ after: 0, wait: 0 });
  clock = 60_000;
  assert.equal(await manager.expireIdle(60_000), false);
  await manager.surfaceInput([], { viewer: 'viewer-a' });
  clock = 120_000;
  assert.equal(await manager.expireIdle(60_000), true);
  assert.equal(manager.state().controller, 'none');
  assert.equal(manager.state().scopes.length, 0);
  assert.match(manager.state().notice.message, /temporary profile was cleared/);
  assert.equal(runtimes[0].calls.filter(([kind]) => kind === 'close').length, 1);
  await manager.perform('browser.open', { url: 'https://two.test' });
  assert.equal(runtimes.length, 2);
  assert.equal(manager.state().notice, null);
  await manager.close();
});

test('idle expiry waits for an action and rechecks its completion activity', async () => {
  const { factory } = createRuntimeFactory();
  let clock = 0;
  let finish;
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const manager = createBrowserManager({ now: () => clock, createRuntime: () => {
    const runtime = factory();
    runtime.perform = async () => {
      started();
      await new Promise((resolve) => { finish = resolve; });
    };
    return runtime;
  } });
  const action = manager.perform('browser.open', {});
  await ready;
  clock = 120_000;
  const expiry = manager.expireIdle(60_000);
  finish();
  await action;
  assert.equal(await expiry, false);
  assert.equal(manager.state().scopes.length, 1);
  await manager.close();
});

test('uses one global runtime for provider, MCP, and surface work across chat contexts', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);

  await manager.perform('browser.open', { url: 'https://one.test' }, undefined, { directory: '/one', sessionId: 'ses_one' });
  const mcp = await manager.performMcp('browser_snapshot', {}, undefined);
  await manager.openScope({ directory: '/other', sessionId: 'ses_other' }, manager.state().generation);
  const frame = await manager.surfaceFrame({ after: 0, wait: 0 });

  assert.equal(runtimes.length, 1);
  assert.equal(manager.state().selectedScopeId, 'global');
  assert.deepEqual(manager.state().scopes.map(({ id }) => id), ['global']);
  assert.match(mcp.content[0].text, /https:\/\/one\.test/);
  assert.match(frame.bytes.toString(), /https:\/\/one\.test/);
  assert.equal(runtimes[0].calls.filter(([kind]) => kind === 'perform').length, 1);
  assert.equal(runtimes[0].calls.filter(([kind]) => kind === 'performMcp').length, 1);
  await manager.close();
});

test('serializes provider and MCP operations on the shared browser owner', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);
  await manager.perform('browser.snapshot', {});
  const runtime = runtimes[0];
  const started = Promise.withResolvers();
  const finish = Promise.withResolvers();
  const order = [];
  runtime.perform = async () => {
    order.push('provider-start');
    started.resolve();
    await finish.promise;
    order.push('provider-end');
  };
  runtime.performMcp = async () => { order.push('mcp'); return { content: [] }; };

  const provider = manager.perform('browser.navigate', { url: 'https://one.test' });
  await started.promise;
  const mcp = manager.performMcp('browser_snapshot', {});
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ['provider-start']);
  finish.resolve();
  await Promise.all([provider, mcp]);
  assert.deepEqual(order, ['provider-start', 'provider-end', 'mcp']);
  await manager.close();
});

test('skips queued provider and destructive MCP work when its caller disconnects', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);
  await manager.perform('browser.open', { url: 'https://before.test' });
  const runtime = runtimes[0];
  const started = Promise.withResolvers();
  const release = Promise.withResolvers();
  const perform = runtime.perform.bind(runtime);
  runtime.perform = async (action, parameters, signal) => {
    if (action === 'hold-queue') {
      started.resolve();
      await release.promise;
      return { held: true };
    }
    return perform(action, parameters, signal);
  };

  const blocker = manager.perform('hold-queue', {});
  await started.promise;
  const mcpAbort = new AbortController();
  const providerAbort = new AbortController();
  const cancelledMcp = manager.performMcp('browser_close', {}, mcpAbort.signal);
  const cancelledProvider = manager.perform('browser.navigate', { url: 'https://must-not-open.test' }, providerAbort.signal);
  mcpAbort.abort(new DOMException('MCP client disconnected', 'AbortError'));
  providerAbort.abort(new DOMException('Provider caller disconnected', 'AbortError'));
  release.resolve();

  await blocker;
  await assert.rejects(cancelledMcp, { name: 'AbortError' });
  await assert.rejects(cancelledProvider, { name: 'AbortError' });
  assert.equal(runtime.calls.some(([kind, name]) => kind === 'performMcp' && name === 'browser_close'), false);
  assert.equal(runtime.calls.some(([kind, action]) => kind === 'perform' && action === 'browser.navigate'), false);
  assert.match((await manager.performMcp('browser_snapshot', {})).content[0].text, /https:\/\/before\.test/);
  await manager.close();
});

test('user control blocks provider and MCP actions while the controlling viewer may use the dock', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);
  await manager.perform('browser.open', { url: 'https://before.test' });
  await manager.surfaceControl('user', 'viewer-a');
  const generation = manager.state().generation;

  await assert.rejects(manager.perform('browser.snapshot', {}), /user controls the browser/i);
  await assert.rejects(manager.performMcp('browser_snapshot', {}), /user controls the browser/i);
  await assert.rejects(manager.navigate('https://viewer-b.test', generation, { viewer: 'viewer-b' }), /surface is idle/i);
  await manager.navigate('https://viewer-a.test', generation, { viewer: 'viewer-a' });
  assert.equal(runtimes[0].url, 'https://viewer-a.test');

  await manager.surfaceControl('none');
  await manager.performMcp('browser_snapshot', {});
  await manager.close();
});

test('rejects dock commands and input made from the frame of a replaced tab', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);
  await manager.perform('browser.open', { url: 'https://first.test' });
  const first = await manager.surfaceFrame({ after: 0, wait: 0 });
  const generation = manager.state().generation;

  await manager.newTab(generation);
  await assert.rejects(manager.reload(generation), /view changed/i);
  await assert.rejects(
    manager.surfaceInput([{ type: 'text', text: 'stale' }], { viewer: 'viewer-a', frameSeq: first.sequence }),
    /view changed/i,
  );
  await manager.surfaceControl('none');
  const current = await manager.surfaceFrame({ after: first.sequence, wait: 0 });
  await manager.surfaceInput([{ type: 'text', text: 'current' }], { viewer: 'viewer-a', frameSeq: current.sequence });

  const inputs = runtimes[0].calls.filter(([kind]) => kind === 'input');
  assert.equal(inputs.length, 1);
  assert.deepEqual(inputs[0][1], [{ type: 'text', text: 'current' }]);
  await manager.close();
});

test('rejects panel input from an earlier document in the same tab', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);
  await manager.perform('browser.open', { url: 'https://first.test' });
  const first = await manager.surfaceFrame({ after: 0, wait: 0 });

  await manager.navigate('https://next.test', manager.state().generation);
  await assert.rejects(
    manager.surfaceInput([{ type: 'text', text: 'stale' }], { viewer: 'viewer-a', frameSeq: first.sequence }),
    /view changed/i,
  );
  await manager.surfaceControl('none');
  const current = await manager.surfaceFrame({ after: first.sequence, wait: 0 });
  await manager.surfaceInput([{ type: 'text', text: 'current' }], { viewer: 'viewer-a', frameSeq: current.sequence });

  const inputs = runtimes[0].calls.filter(([kind]) => kind === 'input');
  assert.equal(inputs.length, 1);
  assert.deepEqual(inputs[0][1], [{ type: 'text', text: 'current' }]);
  await manager.close();
});

test('recreates one shared runtime after Chromium exits and reports the reset', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);
  await manager.perform('browser.open', { url: 'https://before-crash.test' });
  runtimes[0].die();
  const deadline = Date.now() + 1_000;
  while (manager.state().scopes.length && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 5));

  assert.deepEqual(manager.state().scopes, []);
  assert.match(manager.state().notice.message, /stopped unexpectedly/i);
  await manager.performMcp('browser_snapshot', {});
  assert.equal(runtimes.length, 2);
  assert.equal(manager.state().selectedScopeId, 'global');
  assert.equal(manager.state().notice, null);
  assert.deepEqual(runtimes[0].calls.at(-1), ['close']);
  await manager.close();
});

test('sizes the shared page from the viewer and retains one selected viewport', async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);
  await manager.setDevicePixelRatio(2);
  assert.deepEqual(await manager.surfaceResize({ width: 1400, height: 1000 }), { width: 1400, height: 1000 });
  await manager.perform('browser.open', { url: 'https://sized.test' });
  assert.deepEqual(runtimes[0].calls.find(([kind]) => kind === 'resize'), ['resize', { width: 700, height: 500 }]);

  const generation = manager.state().generation;
  await manager.setViewport({ mode: 'fixed', width: 500, height: 400, mobile: false }, generation);
  assert.deepEqual(runtimes[0].calls.at(-1), ['viewport', { mode: 'fixed', source: 'viewer', width: 500, height: 400, mobile: false }]);
  await assert.rejects(manager.setNativeSelectCompatibility(true, generation + 1), /view changed/i);
  await manager.setNativeSelectCompatibility(true, generation);
  assert.equal(manager.state().scopes[0].nativeSelectCompatibility, true);
  await manager.close();
});

test('closes Chromium immediately when shutdown races a stuck browser operation', { timeout: 2_000 }, async () => {
  const { factory, runtimes } = createRuntimeFactory();
  const manager = managerFor(factory);
  await manager.perform('browser.snapshot', {});
  const runtime = runtimes[0];
  let failStuck;
  runtime.perform = () => new Promise((_resolve, reject) => { failStuck = reject; });
  runtime.close = async () => {
    runtime.calls.push(['close']);
    failStuck(new Error('CDP connection is closed'));
  };
  const stuck = assert.rejects(manager.perform('browser.snapshot', {}), /connection is closed/);
  await new Promise((resolve) => setImmediate(resolve));

  await manager.close();
  await stuck;
  assert.equal(runtime.calls.some(([kind]) => kind === 'close'), true);
});
