// Streamed into an isolated, network-disabled image; never starts a web service.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
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

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, `${command} ${args.join(' ')} failed: ${result.error?.message || result.stderr}`);
  return result.stdout.trim();
}
// Git and a POSIX shell back source control and the web terminal; both must work
// without a package manager in the image.
run('git', ['--version']);
run('sh', ['-c', 'cd /tmp && HOME=/tmp git init -q repo && HOME=/tmp git -C repo status --porcelain >/dev/null']);
run('sh', ['-n', '/entrypoint.sh']);
assert.equal(run('node', [join(root, 'bin/cli.js'), '--version']), pkg.version, 'CLI must import and report the baked version');
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
console.log(`Image checks passed for OpenChamber ${pkg.version}: non-root, Node/Git/shell, CLI/layout, ${checkedModules} module syntax, update guards`);
