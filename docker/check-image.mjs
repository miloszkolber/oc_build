// Streamed into an isolated, network-disabled image; never starts a web service.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/opt/openchamber';
assert.notEqual(process.getuid(), 0, 'Image must run as a non-root user');
assert.equal(process.versions.node.split('.')[0], '22', 'Image must retain Node 22');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, process.env.EXPECTED_VERSION, 'Baked package version');
for (const directory of ['bin', 'server', 'dist', 'node_modules']) {
  assert(statSync(join(root, directory)).isDirectory(), `Missing ${directory} directory`);
}
assert(statSync(join(root, 'dist/index.html')).isFile(), 'Missing web entrypoint');
assert(statSync('/usr/share/licenses/openchamber/LICENSE').isFile(), 'Missing upstream license');
assert(statSync('/entrypoint.sh').mode & 0o111, 'Launcher must be executable');
const browserRoot = join(root, 'extensions/agent-browser');
const browserManifest = JSON.parse(readFileSync(join(browserRoot, 'package.json'), 'utf8'));
assert.equal(browserManifest.openchamber?.contributes?.service?.provides?.[0], 'browser', 'Bundled guest must provide a browser');
assert.equal(browserManifest.openchamber?.contributes?.service?.surface, true, 'Bundled guest must declare its shared surface');
for (const file of [
  'panel/index.html', 'panel/main.js',
  'service/main.js', 'broker/main.js', 'LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES',
  'config.json', `openchamber-agent-browser-${browserManifest.version}.zip`,
]) {
  assert(statSync(join(browserRoot, file)).isFile(), `Missing bundled browser extension file ${file}`);
}
for (const file of ['LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES']) {
  assert(statSync(`/usr/share/licenses/openchamber-agent-browser/${file}`).isFile(),
    `Missing browser extension attribution ${file}`);
}
for (const packageName of ['chromium', 'chromium-common']) {
  assert(statSync(`/usr/share/licenses/debian/${packageName}.copyright`).isFile(),
    `Missing Debian ${packageName} attribution`);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed: ${result.error?.message || result.stderr}`);
  return result.stdout.trim();
}
// Git and a POSIX shell back source control and the web terminal; both must work
// without a package manager in the image.
run('git', ['--version']);
run('sh', ['-c', 'cd /tmp && HOME=/tmp git init -q repo && HOME=/tmp git -C repo status --porcelain >/dev/null']);
const chromiumVersion = run('/usr/lib/chromium/chromium', ['--version']);
assert.match(chromiumVersion, /Chromium/i,
  'Bundled Chromium executable must start and report its version');
const browserBuild = JSON.parse(readFileSync('/usr/share/openchamber/browser-build.json', 'utf8'));
assert.equal(browserBuild.chromiumVersion, chromiumVersion, 'Browser build metadata must match the bundled executable');
assert.equal(typeof browserBuild.nssSoftoknModule, 'string', 'Browser build metadata must identify the NSS softoken module');
assert(statSync(browserBuild.nssSoftoknModule).isFile(), 'Chromium NSS database module must be packaged');
const nssModuleRoot = dirname(browserBuild.nssSoftoknModule);
for (const module of [
  'libnss3.so', 'libnssutil3.so', 'libnssckbi.so', 'libnssdbm3.so',
  'libsoftokn3.so', 'libsoftokn3.chk', 'libfreebl3.so', 'libfreebl3.chk',
  'libfreeblpriv3.so', 'libfreeblpriv3.chk',
]) {
  assert(statSync(join(nssModuleRoot, module)).isFile(), `Chromium NSS module ${module} must be packaged`);
}
assert.match(browserBuild.sourceRevision, /^(?:unknown|[a-f0-9]{40}|tree-sha256:[a-f0-9]{64})$/i,
  'Browser build source revision or local source-tree fingerprint');
for (const packageName of ['chromium', 'chromium-common', 'fonts-liberation', 'ca-certificates']) {
  assert.match(browserBuild.packages?.[packageName] ?? '', /\S/, `Missing ${packageName} build version`);
}
assert.equal(JSON.parse(readFileSync(join(browserRoot, 'config.json'), 'utf8')).chromePath,
  '/usr/lib/chromium/chromium', 'The broker must use the image Chromium path explicitly');
// The HTTPS remote helper is a separate binary with its own library closure;
// a missing libcurl there only shows up as a failed clone.
const helper = spawnSync('/usr/lib/git-core/git-remote-https', ['https://example.invalid/x.git'],
  { encoding: 'utf8', timeout: 20_000 });
assert(!/error while loading shared libraries/.test(helper.stderr || ''),
  `git-remote-https cannot load its libraries: ${(helper.stderr || '').trim()}`);
run('sh', ['-n', '/entrypoint.sh']);
assert.equal(run('node', [join(root, 'bin/cli.js'), '--version']), pkg.version, 'CLI must import and report the baked version');
for (const file of ['panel/main.js', 'service/main.js', 'broker/main.js']) {
  run('node', ['--check', join(browserRoot, file)]);
}
// Check runtime modules only. Upstream ships test sources that need a test-runner
// transform, so a duplicate binding in an unused test file is not image corruption.
let checkedModules = 0;
for (const directory of ['bin', 'server']) {
  for (const entry of readdirSync(join(root, directory), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:js|mjs|cjs)$/.test(entry.name)) continue;
    if (/\.(?:test|spec)\.(?:js|mjs|cjs)$/.test(entry.name)) continue;
    run('node', ['--check', join(entry.parentPath, entry.name)]);
    checkedModules += 1;
  }
}
assert(checkedModules > 100, `Expected many runtime modules, checked ${checkedModules}`);

// Exercise the packaged broker, guest service, Chromium and MCP against an
// exact-origin loopback fixture in the same restricted runtime as this check.
const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const freePort = async () => {
  const server = net.createServer();
  const port = await listen(server);
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
};
const chromiumProcesses = () => readdirSync('/proc')
  .filter((entry) => /^\d+$/.test(entry))
  .filter((pid) => {
    try { return /(?:\/usr\/lib\/chromium\/|chrome_crashpad_handler)/i.test(readFileSync(`/proc/${pid}/cmdline`, 'utf8')); }
    catch { return false; }
  });
const fixture = http.createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'image-smoke=shared; Path=/; SameSite=Lax' });
  response.end(`<!doctype html><html><head><title>Image smoke</title><style>body{margin:0}input{position:absolute;left:10px;top:10px;width:240px;height:36px}a{position:absolute;left:10px;top:70px}</style></head><body><h1>Image smoke page</h1><input id="name" aria-label="Name" value="initial"><a id="next" href="/next">Next</a><script>console.log('image-smoke-console')</script></body></html>`);
});
let deniedRequests = 0;
const denied = http.createServer((_request, response) => {
  deniedRequests += 1;
  response.end('unapproved private page');
});
const smokeDir = mkdtempSync(join(os.tmpdir(), 'openchamber-image-smoke-'));
let broker;
let guest;
let browserWasStarted = false;
try {
  assert.deepEqual(readdirSync(os.tmpdir()).filter((name) => name.startsWith('openchamber-agent-browser-')), [],
    'The isolated image check begins without a stale browser profile');
  const fixturePort = await listen(fixture);
  const deniedPort = await listen(denied);
  const apiPort = await freePort();
  let mcpPort = await freePort();
  while (mcpPort === apiPort) mcpPort = await freePort();
  let servicePort = await freePort();
  while ([apiPort, mcpPort].includes(servicePort)) servicePort = await freePort();
  const fixtureOrigin = `http://127.0.0.1:${fixturePort}`;
  const deniedOrigin = `http://127.0.0.1:${deniedPort}`;
  const configPath = join(smokeDir, 'config.json');
  writeFileSync(configPath, JSON.stringify({
    chromePath: '/usr/lib/chromium/chromium',
    allowedOrigins: [fixtureOrigin],
  }));
  const { startBroker } = await import(pathToFileURL(join(browserRoot, 'broker/main.js')));
  const { startService } = await import(pathToFileURL(join(browserRoot, 'service/main.js')));
  const token = 'image-browser-smoke-token';
  broker = await startBroker({ env: {
    OPENCHAMBER_BROWSER_CONFIG_PATH: configPath,
    OPENCHAMBER_BROWSER_NO_SANDBOX: '1',
    OPENCHAMBER_BROWSER_MCP_TOKEN: token,
    OPENCHAMBER_BROWSER_API_PORT: String(apiPort),
    OPENCHAMBER_BROWSER_MCP_PORT: String(mcpPort),
  } });
  guest = await startService({ env: {
    OPENCHAMBER_SERVICE_TOKEN: token,
    OPENCHAMBER_SERVICE_PORT: String(servicePort),
    OPENCHAMBER_BROWSER_BROKER_URL: `http://127.0.0.1:${apiPort}`,
  } });
  const guestUrl = `http://127.0.0.1:${servicePort}`;
  const auth = { authorization: `Bearer ${token}` };
  let requestId = 0;
  const mcp = async (method, params = {}) => {
    const response = await fetch(`http://127.0.0.1:${mcpPort}/mcp`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
    });
    assert.equal(response.status, 200, `MCP ${method} HTTP status`);
    const message = await response.json();
    assert(!message.error, `MCP ${method}: ${message.error?.message ?? 'unknown error'}`);
    return message.result;
  };
  const tool = async (name, args = {}) => {
    const result = await mcp('tools/call', { name, arguments: args });
    assert.notEqual(result?.isError, true, `${name}: ${result?.content?.[0]?.text ?? 'tool failed'}`);
    return result;
  };
  assert.equal((await fetch(`http://127.0.0.1:${mcpPort}/health`)).status, 200,
    'Broker health stays available for readiness without MCP credentials');
  const unauthorized = await fetch(`http://127.0.0.1:${mcpPort}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: {} }),
  });
  assert.equal(unauthorized.status, 401, 'MCP rejects calls without the configured bearer token');
  const wrongToken = await fetch(`http://127.0.0.1:${mcpPort}/mcp`, {
    method: 'POST',
    headers: { authorization: 'Bearer wrong-image-smoke-token', 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'initialize', params: {} }),
  });
  assert.equal(wrongToken.status, 401, 'MCP rejects an incorrect bearer token');
  assert.deepEqual(chromiumProcesses(), [], 'Unauthorized MCP requests must not launch Chromium');
  assert.deepEqual(readdirSync(os.tmpdir()).filter((name) => name.startsWith('openchamber-agent-browser-')), [],
    'Unauthorized MCP requests must not create a browser profile');
  await mcp('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'image-check', version: '1' } });
  assert.equal((await mcp('tools/list')).tools.length, 37, 'MCP tool inventory');
  // Exercise lazy browser creation from the MCP client before the provider has
  // opened a tab; health/initialize alone do not launch or attach Chromium.
  await tool('browser_navigate', { url: fixtureOrigin, waitUntil: 'domcontentloaded' });
  assert.match((await tool('browser_snapshot')).content[0].text, /Image smoke page/,
    'The first MCP browser action must create and attach the shared page');
  assert(readdirSync(os.tmpdir()).some((name) => name.startsWith('openchamber-agent-browser-')),
    'Chromium profile must be created under the bounded temporary directory');
  assert(chromiumProcesses().length > 0, 'A real Chromium process must back the live MCP session');
  browserWasStarted = true;
  const mcpOpenedState = await fetch(`${guestUrl}/browser/state`, { headers: auth }).then((response) => response.json());
  assert.equal(mcpOpenedState.scopes.length, 1, 'MCP creates one global browser scope');
  const mcpTab = mcpOpenedState.scopes[0].tabs.find((tab) => tab.active);
  assert(mcpTab?.id, 'MCP creates an active tab in the global browser');
  const providerResponse = await fetch(`${guestUrl}/browser-control`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'image-smoke-open', action: 'browser.open', parameters: { url: fixtureOrigin, tabId: mcpTab.id, viewport: 'desktop' }, context: null }),
  });
  assert.equal(providerResponse.status, 200, 'OpenChamber browser-provider request');
  const providerOpen = await providerResponse.json();
  assert.equal(providerOpen.ok, true,
    `OpenChamber browser-provider must open the fixture: ${providerOpen.error ?? JSON.stringify(providerOpen)}`);
  assert.equal(providerOpen.data.url, `${fixtureOrigin}/`, 'Provider opens the expected shared tab');
  assert.equal(providerOpen.data.tabId, mcpTab.id, 'Provider reuses the exact tab first opened through MCP');
  assert.match((await tool('browser_snapshot')).content[0].text, /Image smoke page/);
  assert.match((await tool('browser_get_cookies')).content[0].text, /image-smoke.*shared/);
  assert.match((await tool('browser_console_messages')).content[0].text, /image-smoke-console/);
  const networkLog = (await tool('browser_network_requests')).content[0].text;
  assert.match(networkLog, new RegExp(`GET ${fixtureOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`),
    'MCP must report the real page request');
  const screenshot = (await tool('browser_screenshot')).content[0];
  assert.equal(screenshot?.type, 'image', 'MCP screenshot must return image content');
  assert.equal(screenshot?.mimeType, 'image/png', 'MCP screenshot MIME type');
  assert.deepEqual(Buffer.from(screenshot.data, 'base64').subarray(0, 8),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'MCP screenshot must contain PNG bytes');

  const frameResponse = await fetch(`${guestUrl}/surface/frame?after=0&wait=8000`, { headers: auth });
  assert.equal(frameResponse.status, 200, 'OpenChamber surface frame');
  assert.match(frameResponse.headers.get('content-type') ?? '', /^image\/(?:jpeg|png)/);
  const frameSeq = frameResponse.headers.get('x-surface-seq');
  assert(frameSeq, 'Surface frame sequence');
  const modifiers = { alt: false, ctrl: false, meta: false, shift: false };
  const clickInput = await fetch(`${guestUrl}/surface/input`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json', 'x-surface-viewer': 'image-check', 'x-surface-frame-seq': frameSeq },
    body: JSON.stringify({ events: [
      { type: 'pointer', action: 'down', x: 80, y: 24, button: 0, buttons: 1, modifiers },
      { type: 'pointer', action: 'up', x: 80, y: 24, button: 0, buttons: 0, modifiers },
      { type: 'key', action: 'down', key: 'a', code: 'KeyA', modifiers: { ...modifiers, ctrl: true } },
      { type: 'key', action: 'up', key: 'a', code: 'KeyA', modifiers: { ...modifiers, ctrl: true } },
      { type: 'text', text: 'from-panel' },
    ] }),
  });
  assert.equal(clickInput.status, 204, 'Panel input is applied to the shared Chromium page');
  const blockedDuringControl = await mcp('tools/call', { name: 'browser_evaluate', arguments: { expression: 'document.querySelector("#name").value' } });
  assert.equal(blockedDuringControl.isError, true, 'MCP mutation is refused while the panel controls the browser');
  await fetch(`${guestUrl}/surface/control`, {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ controller: 'none' }),
  }).then((response) => assert.equal(response.status, 204, 'Panel hand-back'));
  assert.equal((await tool('browser_evaluate', { expression: 'document.querySelector("#name").value' })).content[0].text, 'from-panel',
    'MCP observes the exact form value entered through the OpenChamber surface');
  const providerNext = await fetch(`${guestUrl}/browser-control`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ requestId: 'image-smoke-next', action: 'browser.open', parameters: { url: `${fixtureOrigin}/next`, tabId: providerOpen.data.tabId }, context: null }),
  });
  assert.equal((await providerNext.json()).ok, true, 'Provider navigates the same tab to its history successor');
  const staleInput = await fetch(`${guestUrl}/surface/input`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json', 'x-surface-viewer': 'image-check', 'x-surface-frame-seq': frameSeq },
    body: JSON.stringify({ events: [{ type: 'text', text: 'stale-panel-input' }] }),
  });
  assert.equal(staleInput.status, 409,
    `Input from the previous document is rejected even when its tab did not change: ${await staleInput.text()}`);
  await fetch(`${guestUrl}/surface/control`, {
    method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ controller: 'none' }),
  }).then((response) => assert.equal(response.status, 204, 'Stale-input hand-back'));
  assert.match((await tool('browser_back')).content[0].text, /back/i);
  const state = await fetch(`${guestUrl}/browser/state`, { headers: auth }).then((response) => response.json());
  assert.equal(state.scopes[0].url, `${fixtureOrigin}/`, 'Provider state follows MCP history on the same tab');
  await tool('browser_navigate', { url: deniedOrigin, waitUntil: 'domcontentloaded' });
  assert.match((await tool('browser_snapshot')).content[0].text, /private.*denied|private.*blocked/i,
    'Unapproved private destinations stay blocked');
  assert.equal(deniedRequests, 0, 'The blocked private origin must receive no HTTP request');
  console.log('Image browser smoke passed: restricted Chromium, provider/MCP/panel shared state, input/control/stale-frame handoff, cookies/history, console/network/screenshot, exact-origin policy');
} finally {
  await guest?.close();
  await broker?.close();
  const leftoverProfiles = readdirSync(os.tmpdir()).filter((name) => name.startsWith('openchamber-agent-browser-'));
  const leftoverBrowsers = chromiumProcesses();
  await Promise.all([fixture, denied].map((server) => new Promise((resolve) => server.close(resolve))));
  rmSync(smokeDir, { recursive: true, force: true });
  if (browserWasStarted) {
    assert.deepEqual(leftoverProfiles, [], 'Broker shutdown must remove its temporary Chromium profile');
    assert.deepEqual(leftoverBrowsers, [], 'Broker shutdown must leave no Chromium or Crashpad processes behind');
  }
}

// Exercise the actual patched route handlers, not a marker-text assertion.
const { registerOpenChamberRoutes } = await import(pathToFileURL(join(root, 'server/lib/opencode/openchamber-routes.js')));
for (const runtime of [undefined, 'web', 'desktop']) {
  const routes = new Map();
  const app = Object.fromEntries(['get', 'post'].map(method => [method, (path, handler) => {
    const key = `${method} ${path}`;
    if (path === '/api/openchamber/update-check' || path === '/api/openchamber/update-install') {
      assert(!routes.has(key), `Duplicate update route: ${key}`);
    }
    routes.set(key, handler);
  }]));
  registerOpenChamberRoutes(app, {
    process: { env: runtime ? { OPENCHAMBER_RUNTIME: runtime } : {} },
    desktopUpdater: {
      check() { throw new Error('Updater must not run'); },
      install() { throw new Error('Updater must not run'); },
      restart() { throw new Error('Updater must not run'); },
    },
  });
  for (const [method, status, body] of [
    ['get', 200, { available: false }],
    ['post', 503, { error: 'In-app updates are disabled; update through an image rebuild.' }],
  ]) {
    const response = { code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
    const handler = routes.get(`${method} /api/openchamber/update-${method === 'get' ? 'check' : 'install'}`);
    assert.equal(typeof handler, 'function', `Expected update route (${runtime || 'default'} runtime)`);
    await handler({ headers: {}, query: { appType: 'web' } }, response);
    assert.equal(response.code, status, `${method} status (${runtime || 'default'} runtime)`);
    assert.deepEqual(response.body, body, `${method} body (${runtime || 'default'} runtime)`);
  }
}
console.log(`Image checks passed for OpenChamber ${pkg.version}: non-root, Node/Git/shell/Chromium ${chromiumVersion}, browser guest, CLI/layout, ${checkedModules} module syntax, update guards`);
