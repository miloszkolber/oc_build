import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { MCP_TOOLS } from '../src/mcp-tools.js';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(manifest.openchamber.engines.openchamber, '>=2.1.1');
assert.equal(manifest.openchamber.contributes.panel.entry, 'panel/index.html');
assert.equal(manifest.openchamber.contributes.service.entry, 'service/main.js');
assert.deepEqual(manifest.openchamber.contributes.service.provides, ['browser']);
assert.equal(manifest.openchamber.contributes.service.surface, true);
assert.equal(manifest.scripts.start, 'node broker/main.js');
assert.equal(MCP_TOOLS.length, 37);
assert.equal(new Set(MCP_TOOLS.map(({ name }) => name)).size, 37);

const builtManifest = JSON.parse(await readFile('dist/package.json', 'utf8'));
assert.equal(builtManifest.version, manifest.version);
assert.equal(builtManifest.openchamber.contributes.panel.entry, 'panel/index.html');
assert.equal(builtManifest.openchamber.contributes.service.entry, 'service/main.js');
for (const file of [
  'package.json', 'README.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES', 'config.example.json',
  'service/main.js', 'broker/main.js', 'panel/index.html', 'panel/main.js',
]) {
  assert.ok((await readFile(`dist/${file}`)).byteLength > 0, `dist/${file} must be built before the package check`);
}

await Promise.all([
  build({ entryPoints: ['src/main.js'], bundle: true, platform: 'node', format: 'esm', target: 'node22', write: false }),
  build({ entryPoints: ['src/broker-main.js'], bundle: true, platform: 'node', format: 'esm', target: 'node22', write: false }),
  build({ entryPoints: ['src/panel.js'], bundle: true, platform: 'browser', format: 'iife', target: 'es2022', write: false }),
]);
console.log(`checked dist package paths, guest service, broker, panel, and ${MCP_TOOLS.length} MCP tools`);
