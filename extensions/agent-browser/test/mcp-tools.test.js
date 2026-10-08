import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createMcpService } from '../src/mcp-service.js';
import { createMcpToolExecutor, MCP_TOOLS } from '../src/mcp-tools.js';

const INITIAL_URL = 'http://fixture.test/start';
const NETWORK_TOKEN_SENTINEL = 'network-token-sentinel-78f4';
const NETWORK_PASSWORD_SENTINEL = 'network-password-sentinel-381a';
const CONSOLE_TOKEN_SENTINEL = 'console-token-sentinel-95c2';
const CONSOLE_PASSWORD_SENTINEL = 'console-password-sentinel-04d8';
const FORM_PASSWORD_SENTINEL = 'form-password-sentinel-5ce7';
const FORM_TOKEN_SENTINEL = 'form-token-sentinel-cb31';
const FORM_TEXTAREA_PASSWORD_SENTINEL = 'form-textarea-password-sentinel-7ef1';
const FORM_TEXTAREA_TOKEN_SENTINEL = 'form-textarea-token-sentinel-84a2';
const FORM_WRAPPER_PASSWORD_SENTINEL = 'form-wrapper-password-sentinel-a2c4';
const FORM_WRAPPER_TOKEN_SENTINEL = 'form-wrapper-token-sentinel-b3d5';
const IMAGE_DATA = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/G9sAAAAASUVORK5CYII=';
const PDF_DATA = Buffer.from('%PDF-1.4\nfixture\n%%EOF').toString('base64');

const fixtureMarkup = `<!doctype html>
  <html><head><title>MCP tool fixture</title></head><body>
    <h1>MCP tool fixture</h1>
    <p id="result">Needle has context.</p>
    <a id="inside" href="/next">Internal destination</a>
    <a id="outside" href="https://remote.test/path">External destination</a>
    <button id="click">Click me</button>
    <form id="fixture-form" name="fixture-form">
      <input id="name" name="name" value="Before">
      <input id="password" name="password" type="password" value="${FORM_PASSWORD_SENTINEL}">
      <input id="token" name="access_token" value="${FORM_TOKEN_SENTINEL}">
      <textarea id="password-textarea" name="password">${FORM_TEXTAREA_PASSWORD_SENTINEL}</textarea>
      <textarea id="token-textarea" name="access_token">${FORM_TEXTAREA_TOKEN_SENTINEL}</textarea>
      <div id="sensitive-wrapper" role="button">Safe wrapper label
        <textarea id="wrapper-password" name="password">${FORM_WRAPPER_PASSWORD_SENTINEL}</textarea>
        <textarea id="wrapper-token" name="access_token">${FORM_WRAPPER_TOKEN_SENTINEL}</textarea>
      </div>
      <input id="safe" name="displayName" value="safe-form-value">
      <input id="check" name="check" type="checkbox">
      <select id="choice" name="choice"><option value="a">Alpha</option><option value="b">Beta</option></select>
      <button id="submit" type="submit">Submit fixture</button>
    </form>
    <div class="item">Alpha item</div><div class="item">Beta item</div>
    <span id="attribute" data-value="fixture-value">Extract me</span>
    <div id="late">Already present</div>
    <pre>Fixture code</pre>
  </body></html>`;

const createRuntime = async () => {
  const window = new Window({ url: INITIAL_URL });
  window.document.write(fixtureMarkup);
  await window.happyDOM.whenAsyncComplete();
  window.HTMLElement.prototype.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 24, width: 100, height: 24,
    toJSON() { return this; },
  });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  let scrollX = 0;
  let scrollY = 0;
  window.scrollTo = (x, y) => {
    if (x && typeof x === 'object') {
      scrollX = Number(x.left ?? scrollX);
      scrollY = Number(x.top ?? scrollY);
    } else {
      scrollX = Number(x ?? scrollX);
      scrollY = Number(y ?? scrollY);
    }
  };
  window.scrollBy = (x, y) => window.scrollTo(scrollX + Number(x || 0), scrollY + Number(y || 0));
  Object.defineProperties(window, {
    scrollX: { configurable: true, get: () => scrollX },
    scrollY: { configurable: true, get: () => scrollY },
  });
  window.document.querySelector('#click').addEventListener('click', () => {
    window.document.querySelector('#result').textContent = 'Clicked fixture button';
  });
  window.document.querySelector('#fixture-form').addEventListener('submit', (event) => event.preventDefault());
  window.document.querySelector('#submit').addEventListener('click', () => {
    window.document.querySelector('#result').textContent = 'Form submitted';
  });

  const tabs = [{ id: 'tab-1', url: INITIAL_URL, title: 'MCP tool fixture' }];
  let activeTabId = 'tab-1';
  let currentUrl = INITIAL_URL;
  let history = [INITIAL_URL];
  let historyIndex = 0;
  let nextTab = 2;
  let cookies = [
    { name: 'session', value: 'fixture-session', domain: 'fixture.test', path: '/', secure: false, httpOnly: true },
    { name: 'remote', value: 'other-domain', domain: 'remote.test', path: '/', secure: true, httpOnly: false },
  ];
  const keyEvents = [];
  const setLocation = (value, { push = false } = {}) => {
    const next = new URL(value, currentUrl).href;
    window.history.replaceState({}, '', next);
    currentUrl = next;
    const active = tabs.find(({ id }) => id === activeTabId);
    if (active) active.url = next;
    if (push) {
      history = history.slice(0, historyIndex + 1);
      history.push(next);
      historyIndex = history.length - 1;
    }
  };
  const page = {
    sessionId: 'session-tab-1',
    cdp: {
      async sendSession(_sessionId, method, parameters = {}) {
        if (method === 'Runtime.evaluate') {
          try {
            const result = await window.eval(parameters.expression);
            return { result: result === undefined ? {} : { value: result } };
          } catch (error) {
            return { exceptionDetails: { text: error.message, exception: { description: error.message } } };
          }
        }
        if (method === 'Page.navigate') {
          setLocation(parameters.url, { push: true });
          return {};
        }
        if (method === 'Input.dispatchKeyEvent') {
          keyEvents.push(parameters);
          return {};
        }
        if (method === 'Page.getLayoutMetrics') return { cssLayoutViewport: { clientWidth: 800, clientHeight: 600 } };
        if (method === 'Page.captureScreenshot') return { data: IMAGE_DATA };
        if (method === 'Page.printToPDF') return { data: PDF_DATA };
        throw new Error(`Unexpected CDP method ${method}`);
      },
    },
  };
  const runtime = {
    get activeTabId() { return activeTabId; },
    get url() { return tabs.find(({ id }) => id === activeTabId)?.url ?? 'about:blank'; },
    get viewport() { return { width: 800, height: 600 }; },
    get tabs() { return tabs.map((tab) => ({ ...tab, active: tab.id === activeTabId })); },
    ensurePage: async () => page,
    onNavigationChanged() { return () => {}; },
    mcpNetworkRequests: () => [{
      status: 200, method: 'GET',
      url: `http://fixture.test/api?token=${NETWORK_TOKEN_SENTINEL}&password=${NETWORK_PASSWORD_SENTINEL}&keep=visible`,
      bodySize: 12,
    }],
    mcpConsoleMessages: () => [`fixture console entry token=${CONSOLE_TOKEN_SENTINEL} password=${CONSOLE_PASSWORD_SENTINEL} status=ready`],
    async closeAllTabs() {
      const count = tabs.length;
      tabs.length = 0;
      activeTabId = null;
      return count;
    },
    async getCookies() { return cookies.map((cookie) => ({ ...cookie })); },
    async setCookies(values) {
      for (const cookie of values) {
        cookies = cookies.filter((current) => current.name !== cookie.name || current.domain !== cookie.domain || current.path !== cookie.path);
        cookies.push({ ...cookie });
      }
    },
    async clearCookies() { cookies = []; },
    async openMcpTab() {
      const id = `tab-${nextTab++}`;
      tabs.push({ id, url: INITIAL_URL, title: 'MCP tool fixture' });
      activeTabId = id;
      history = [INITIAL_URL];
      historyIndex = 0;
      setLocation(INITIAL_URL);
      return { targetId: id };
    },
    async agentPage(targetId) { return { ...page, targetId, sessionId: `session-${targetId}` }; },
    async command(name, parameters = {}) {
      if (name === 'back' && historyIndex > 0) {
        historyIndex -= 1;
        setLocation(history[historyIndex]);
      } else if (name === 'forward' && historyIndex < history.length - 1) {
        historyIndex += 1;
        setLocation(history[historyIndex]);
      } else if (name === 'tab-select') {
        activeTabId = parameters.tabId;
        const selected = tabs.find(({ id }) => id === activeTabId);
        setLocation(selected.url);
      } else if (name === 'tab-close') {
        const index = tabs.findIndex(({ id }) => id === parameters.tabId);
        tabs.splice(index, 1);
        if (activeTabId === parameters.tabId) {
          activeTabId = tabs.at(-1)?.id ?? null;
          const selected = tabs.find(({ id }) => id === activeTabId);
          if (selected) setLocation(selected.url);
        }
      }
    },
  };
  runtime.performMcp = createMcpToolExecutor(runtime);
  return { runtime, window, keyEvents };
};

test('the broker executes each advertised Obscura v0.2.4 tool through its browser mapping', async (context) => {
  const fixture = await createRuntime();
  const token = 'mcp-tools-test-token';
  const service = createMcpService({ runtime: fixture.runtime, token, port: 0 });
  const address = await service.listen();
  const origin = `http://${address.host}:${address.port}`;
  context.after(async () => {
    await service.close();
    await fixture.window.happyDOM.abort();
  });
  const called = [];
  const call = async (name, args = {}) => {
    called.push(name);
    const response = await fetch(`${origin}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: called.length, method: 'tools/call', params: { name, arguments: args } }),
    });
    assert.equal(response.status, 200);
    const rpc = await response.json();
    assert.ok(rpc.result && !rpc.result.isError, `${name} failed: ${rpc.result?.content?.[0]?.text ?? JSON.stringify(rpc.error)}`);
    return rpc.result;
  };
  const text = async (name, args) => (await call(name, args)).content.find((block) => block.type === 'text').text;

  assert.match(await text('browser_navigate', { url: 'http://fixture.test/next', waitUntil: 'domcontentloaded' }), /Navigated to http:\/\/fixture\.test\/next/);
  const snapshot = await text('browser_snapshot', { max_chars: 200 });
  assert.match(snapshot, /Title: MCP tool fixture/);
  assert.match(snapshot, /Needle has context/);
  assert.match(snapshot, /interactive element\(s\) registered/);
  assert.match(await text('browser_click', { selector: '#click' }), /Clicked/);
  assert.equal(fixture.window.document.querySelector('#result').textContent, 'Clicked fixture button');
  fixture.window.document.querySelector('#result').textContent = 'Needle has context.';
  assert.match(await text('browser_fill', { selector: '#name', value: 'Ada' }), /Filled/);
  assert.match(await text('browser_type', { selector: '#name', text: ' Lovelace' }), /Typed/);
  assert.equal(fixture.window.document.querySelector('#name').value, 'Ada Lovelace');
  assert.match(await text('browser_press_key', { selector: '#name', key: 'Enter' }), /Pressed key/);
  assert.deepEqual(fixture.keyEvents.map(({ type, key }) => [type, key]), [['keyDown', 'Enter'], ['keyUp', 'Enter']]);
  assert.match(await text('browser_select_option', { selector: '#choice', value: 'b' }), /Selected/);
  assert.equal(fixture.window.document.querySelector('#choice').value, 'b');
  assert.equal(await text('browser_evaluate', { expression: 'document.querySelector("#name").value + "|" + document.querySelector("#choice").value' }), 'Ada Lovelace|b');
  assert.match(await text('browser_wait_for', { selector: '#late', timeout: 0 }), /Found/);
  const network = await text('browser_network_requests');
  assert.match(network, /GET http:\/\/fixture\.test\/api\?token=%5BREDACTED%5D&password=%5BREDACTED%5D&keep=visible/);
  assert.doesNotMatch(network, new RegExp(`${NETWORK_TOKEN_SENTINEL}|${NETWORK_PASSWORD_SENTINEL}`));
  const consoleMessages = await text('browser_console_messages');
  assert.match(consoleMessages, /fixture console entry/);
  assert.match(consoleMessages, /status=ready/);
  assert.doesNotMatch(consoleMessages, new RegExp(`${CONSOLE_TOKEN_SENTINEL}|${CONSOLE_PASSWORD_SENTINEL}`));
  assert.match(await text('browser_markdown', { max_chars: 500 }), /# MCP tool fixture/);
  const links = await text('browser_links', { internal_only: true, limit: 10 });
  assert.match(links, /Internal destination/);
  assert.doesNotMatch(links, /remote\.test/);
  const interactiveElements = await text('browser_interactive_elements', { limit: 100 });
  assert.match(interactiveElements, /ref=e\d+/);
  assert.match(interactiveElements, /"Click me"/);
  assert.match(interactiveElements, /name="access_token"/);
  assert.match(interactiveElements, /Safe wrapper label/);
  assert.doesNotMatch(interactiveElements, new RegExp(`${FORM_PASSWORD_SENTINEL}|${FORM_TOKEN_SENTINEL}|${FORM_TEXTAREA_PASSWORD_SENTINEL}|${FORM_TEXTAREA_TOKEN_SENTINEL}|${FORM_WRAPPER_PASSWORD_SENTINEL}|${FORM_WRAPPER_TOKEN_SENTINEL}`));
  assert.match(await text('browser_back'), /Back to http:\/\/fixture\.test\/start/);
  assert.match(await text('browser_forward'), /Forward to http:\/\/fixture\.test\/next/);
  assert.match(await text('browser_reload'), /Reloaded http:\/\/fixture\.test\/next/);
  assert.match(await text('browser_get_cookies', { domain: 'fixture.test' }), /fixture-session/);
  assert.doesNotMatch(await text('browser_get_cookies', { domain: 'fixture.test' }), /other-domain/);
  assert.match(await text('browser_set_cookie', { name: 'sid', value: 'new-session', domain: 'fixture.test', http_only: true }), /Set cookie sid/);
  assert.match(await text('browser_clear_cookies'), /Cleared all cookies/);
  assert.equal(await text('browser_get_cookies'), 'No cookies.');
  assert.match(await text('browser_wait_for_text', { text: 'Needle has context.', timeout: 0 }), /Found text/);
  const formsText = await text('browser_detect_forms');
  assert.match(formsText, /fixture-form/);
  assert.match(formsText, /safe-form-value/);
  assert.doesNotMatch(formsText, new RegExp(`${FORM_PASSWORD_SENTINEL}|${FORM_TOKEN_SENTINEL}|${FORM_TEXTAREA_PASSWORD_SENTINEL}|${FORM_TEXTAREA_TOKEN_SENTINEL}|${FORM_WRAPPER_PASSWORD_SENTINEL}|${FORM_WRAPPER_TOKEN_SENTINEL}`));
  const formFields = JSON.parse(formsText)[0].fields;
  assert.equal(formFields.find(({ name }) => name === 'password').value, '[REDACTED]');
  assert.equal(formFields.find(({ name }) => name === 'access_token').value, '[REDACTED]');
  assert.equal(formFields.find(({ name, type }) => name === 'password' && type === 'textarea').value, '[REDACTED]');
  assert.equal(formFields.find(({ name, type }) => name === 'access_token' && type === 'textarea').value, '[REDACTED]');
  for (const name of ['password', 'access_token']) {
    const textareas = formFields.filter((field) => field.name === name && field.type === 'textarea');
    assert.equal(textareas.length, 2);
    assert.deepEqual(textareas.map(({ value }) => value), ['[REDACTED]', '[REDACTED]']);
  }
  assert.match(await text('browser_fill_form', { fields: [
    { selector: '#name', value: 'Grace', type: 'text' },
    { selector: '#check', type: 'check' },
    { selector: '#choice', value: 'a', type: 'select' },
  ], submit_selector: '#submit' }), /Filled 3 fields/);
  assert.equal(fixture.window.document.querySelector('#name').value, 'Grace');
  assert.equal(fixture.window.document.querySelector('#check').checked, true);
  assert.equal(fixture.window.document.querySelector('#choice').value, 'a');
  assert.equal(fixture.window.document.querySelector('#result').textContent, 'Form submitted');
  assert.match(await text('browser_scroll', { direction: 'down', amount: 40 }), /Scrolled down/);
  assert.match(await text('browser_get_attribute', { selector: '#attribute', attribute: 'data-value' }), /fixture-value/);
  assert.equal(await text('browser_count', { selector: '.item' }), '2');
  assert.match(await text('browser_extract', { schema: { title: 'h1', 'links[]': 'a@href' } }), /"title": "MCP tool fixture"/);
  assert.match(await text('browser_tab_new', { url: 'http://fixture.test/second-tab' }), /navigated to http:\/\/fixture\.test\/second-tab/);
  assert.match(await text('browser_tab_list'), /tab-2  http:\/\/fixture\.test\/second-tab/);
  assert.match(await text('browser_tab_switch', { tab_id: 'tab-1' }), /Active tab: tab-1/);
  assert.match(await text('browser_tab_close', { tab_id: 'tab-2' }), /Closed tab-2/);
  assert.match(await text('browser_search', { query: 'FIXTURE', case_sensitive: false, limit: 3, context_chars: 20 }), /MCP tool fixture/);
  fixture.window.localStorage.setItem('theme', 'dark');
  fixture.window.sessionStorage.setItem('draft', 'saved');
  const storage = JSON.parse(await text('browser_storage_state'));
  assert.deepEqual(storage.origins[0].localStorage, [['theme', 'dark']]);
  assert.deepEqual(storage.origins[0].sessionStorage, [['draft', 'saved']]);
  assert.match(await text('browser_set_storage_state', { state: {
    cookies: [{ name: 'restore', value: 'cookie', domain: 'fixture.test' }],
    origins: [{ origin: 'http://fixture.test', localStorage: [['theme', 'light']], sessionStorage: [['draft', 'restored']] }],
  } }), /Restored 3 state entries/);
  assert.equal(fixture.window.localStorage.getItem('theme'), 'light');
  assert.equal(fixture.window.sessionStorage.getItem('draft'), 'restored');
  const screenshot = (await call('browser_screenshot', { width: 1, height: 1 })).content[0];
  assert.deepEqual([screenshot.type, screenshot.mimeType, screenshot.data], ['image', 'image/png', IMAGE_DATA]);
  const pdf = (await call('browser_pdf', { landscape: true, print_background: true, scale: 1.25 })).content[0];
  assert.deepEqual([pdf.type, pdf.resource.mimeType, pdf.resource.blob], ['resource', 'application/pdf', PDF_DATA]);
  assert.match(await text('browser_close'), /Closed 1 browser tab/);
  assert.deepEqual([...new Set(called)].sort(), MCP_TOOLS.map(({ name }) => name).sort());
  assert.deepEqual(fixture.runtime.tabs, []);
});
