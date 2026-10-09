import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';
import { createBrowserRuntime } from '../src/browser-runtime.js';
import { resolveChromePath } from '../src/chrome-process.js';

let chromePath;
try { chromePath = resolveChromePath(); } catch { /* Browser-gated in the image build. */ }

// The panel is built without a host, so only the static skeleton is present:
// element identities, the two toolbar rows and the bottom bar. State-driven
// content (tabs, status text) is exercised by the browser-integration tests.
const inspect = `(() => {
  const root = document.querySelector('#root');
  root.classList.add('console-open');
  const problems = document.querySelector('.problems');
  problems.hidden = false;
  problems.querySelector('span').textContent = '1';
  const drawer = document.querySelector('.console');
  drawer.hidden = false;
  document.querySelector('.console-header').textContent = 'Errors and warnings since this page loaded.';
  const rights = (selector) => [...document.querySelectorAll(selector)]
    .filter((node) => node.getBoundingClientRect().width > 0)
    .map((node) => Math.round(node.getBoundingClientRect().right));
  return {
    width: innerWidth,
    scroll: root.scrollWidth,
    address: Math.round(document.querySelector('.address').getBoundingClientRect().width),
    navigation: rights('.navigation-row > *'),
    dock: rights('.dock-bar > *'),
    hasDockBar: document.querySelector('.dock-bar') !== null,
    hasStatus: document.querySelector('.dock-bar .status') !== null,
    hasViewportControl: document.querySelector('.dock-bar .viewport-select') !== null,
    hasHandBack: document.querySelector('.dock-bar .hand-back') !== null,
    closeOnTab: document.querySelector('.page-tabs .close-tab') === null
      || document.querySelector('.page-tabs .oc-sdk-tab')?.contains(document.querySelector('.close-tab')) === true,
    rotateRemoved: document.querySelector('[aria-label="Rotate the viewport"]') === null,
    pageTools: document.querySelectorAll('.navigation-row .page-tools > *').length,
  };
})()`;

test('bottom bar carries status, device control and hand-back; rows fit narrow and wide panels', { skip: !chromePath }, async () => {
  const server = http.createServer((req, res) => {
    const file = req.url === '/main.js' ? 'main.js' : 'index.html';
    res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : 'text/html');
    res.end(fs.readFileSync(new URL(`../dist/panel/${file}`, import.meta.url)));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const runtime = createBrowserRuntime({
    chromePath,
    allowedOrigins: [origin],
    noSandbox: process.env.OPENCHAMBER_BROWSER_TEST_NO_SANDBOX === '1',
  });
  try {
    await runtime.performMcp('browser_navigate', { url: origin, waitUntil: 'load' });
    const page = await runtime.ensurePage();
    for (const width of [320, 480, 481, 560, 561, 768]) {
      await runtime.configureViewport({ mode: 'fixed', width, height: 320, mobile: false });
      const result = await page.cdp.sendSession(page.sessionId, 'Runtime.evaluate', { returnByValue: true, expression: inspect });
      const geometry = result.result.value;
      assert.equal(geometry.hasDockBar, true, `Missing bottom bar at ${width}`);
      assert.equal(geometry.hasStatus, true, `Missing status in bottom bar at ${width}`);
      assert.equal(geometry.hasViewportControl, true, `Missing device control in bottom bar at ${width}`);
      assert.equal(geometry.hasHandBack, true, `Missing hand-back in bottom bar at ${width}`);
      assert.equal(geometry.closeOnTab, true, `Close control is not on a tab at ${width}`);
      assert.equal(geometry.rotateRemoved, true, `Rotate control still present at ${width}`);
      assert.ok(geometry.pageTools >= 3, `Expected page tools beside the address at ${width}`);
      assert.ok(geometry.scroll <= width, `Root overflow at ${width}: ${JSON.stringify(geometry)}`);
      assert.ok(geometry.address >= 100, `Address too narrow at ${width}`);
      assert.ok(geometry.navigation.every((right) => right <= width), `Clipped navigation row at ${width}: ${JSON.stringify(geometry.navigation)}`);
      assert.ok(geometry.dock.every((right) => right <= width), `Clipped bottom bar at ${width}: ${JSON.stringify(geometry.dock)}`);
    }
  } finally {
    await runtime.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
