import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';
import { createBrowserRuntime } from '../src/browser-runtime.js';
import { resolveChromePath } from '../src/chrome-process.js';

let chromePath;
try { chromePath = resolveChromePath(); } catch { /* Browser-gated in the image build. */ }

test('built toolbar and error drawer stay within narrow and wide panels', { skip: !chromePath }, async () => {
  const server = http.createServer((req, res) => {
    const file = req.url === '/main.js' ? 'main.js' : 'index.html';
    res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : 'text/html');
    res.end(fs.readFileSync(new URL(`../dist/panel/${file}`, import.meta.url)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const runtime = createBrowserRuntime({ chromePath, allowedOrigins: [origin], noSandbox: process.env.OPENCHAMBER_BROWSER_TEST_NO_SANDBOX === '1' });
  try {
    await runtime.performMcp('browser_navigate', { url: origin, waitUntil: 'load' });
    const page = await runtime.ensurePage();
    for (const width of [320, 480, 481, 560, 561, 768]) {
      await runtime.configureViewport({ mode: 'fixed', width, height: 300, mobile: false });
      const result = await page.cdp.sendSession(page.sessionId, 'Runtime.evaluate', { returnByValue: true, expression: `(() => {
        const root=document.querySelector('#root');
        root.classList.add('console-open');
        const problems=document.querySelector('.problems'); problems.hidden=false; problems.querySelector('span').textContent='1';
        const drawer=document.querySelector('.console'); drawer.hidden=false;
        document.querySelector('.console-header').textContent='Errors and warnings since this page loaded.';
        return {width:innerWidth,scroll:root.scrollWidth,address:document.querySelector('[aria-label="Address"]').getBoundingClientRect().width,
          controls:[...document.querySelectorAll('.viewport-tools>*')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect().right)};
      })()` });
      const geometry = result.result.value;
      assert(geometry.scroll <= width, `Root overflow at ${width}: ${JSON.stringify(geometry)}`);
      assert(geometry.address >= 100, `Address too narrow at ${width}`);
      assert(geometry.controls.every(right => right <= width), `Clipped controls at ${width}`);
    }
  } finally {
    await runtime.close();
    await new Promise(resolve => server.close(resolve));
  }
});
