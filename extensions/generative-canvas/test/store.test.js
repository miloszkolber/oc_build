import { test, expect } from 'bun:test';
import fs from 'node:fs/promises';
import { createStore } from '../src/store.js';
import { startService } from '../src/service.js';
import { costExplorer, revenueDashboard } from '../src/examples.js';
import { parseArtifact } from '../src/catalog.js';

async function fixture(testCase) {
  const root = await fs.mkdtemp('/tmp/opencode/canvas-store-');
  try { await testCase(createStore(root), root); } finally { await fs.rm(root, { recursive: true, force: true }); }
}
test('dashboard fits the actual restricted catalog', () => expect(parseArtifact(revenueDashboard).title).toBe('Revenue pulse'));
test('durable create, reload, rename and delete preserve stable IDs', () => fixture(async (store, root) => {
  const record = await store.create(costExplorer);
  expect((await createStore(root).read(record.id)).artifact.title).toBe(costExplorer.title);
  const renamed = await store.rename(record.id, 'Renamed', record.revision);
  expect(renamed.id).toBe(record.id); expect((await store.list())[0].title).toBe('Renamed');
  await store.remove(record.id, renamed.revision);
  expect(await store.list()).toEqual([]);
}));
test('stale updates and deletes cannot overwrite a newer revision', () => fixture(async store => {
  const original = await store.create(costExplorer);
  const changed = await store.rename(original.id, 'Newer title', original.revision);
  await expect(store.update(original.id, costExplorer, original.revision)).rejects.toThrow('changed');
  await expect(store.remove(original.id, original.revision)).rejects.toThrow('changed');
  expect((await store.read(original.id)).artifact.title).toBe(changed.artifact.title);
}));
test('simultaneous updates serialize and only one stale revision wins', () => fixture(async store => {
  const value = await store.create(costExplorer);
  const results = await Promise.allSettled([store.rename(value.id, 'One', value.revision), store.rename(value.id, 'Two', value.revision)]);
  expect(results.filter(result => result.status === 'fulfilled').length).toBe(1);
}));
test('invalid JSON updates leave the existing file unchanged', () => fixture(async store => {
  const value = await store.create(costExplorer);
  await expect(store.update(value.id, { catalog_version: '2' }, value.revision)).rejects.toThrow();
  expect((await store.read(value.id)).revision).toBe(value.revision);
}));
test('traversal and symlinks cannot expose outside files', () => fixture(async (store, root) => {
  await expect(store.read('../secret.canvas.json')).rejects.toThrow('filename');
  await fs.symlink('/etc/passwd', `${root}/outside.canvas.json`);
  await expect(store.read('outside.canvas.json')).rejects.toThrow();
  expect(await store.list()).toEqual([]);
}));
test('bad agent files remain visible with an error, not silently skipped', () => fixture(async (store, root) => {
  await fs.writeFile(`${root}/bad.canvas.json`, 'not JSON');
  const items = await store.list(); expect(items[0].id).toBe('bad.canvas.json'); expect(items[0].error).toBeTruthy();
}));
test('authenticated service contract includes health, CRUD and conflicts', () => fixture(async store => {
  const server = await startService({ token: 'fixture-token', port: 0, store });
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { authorization: 'Bearer fixture-token', 'content-type': 'application/json' };
  try {
    expect((await fetch(`${base}/health`)).status).toBe(401);
    expect((await fetch(`${base}/health`, { headers })).status).toBe(200);
    const response = await fetch(`${base}/artifacts`, { method: 'POST', headers, body: JSON.stringify(costExplorer) });
    expect(response.status).toBe(200); const value = await response.json();
    const renamed = await fetch(`${base}/artifacts/${value.id}?revision=${value.revision}`, { method: 'PATCH', headers, body: JSON.stringify({ title: 'Service rename' }) });
    expect(renamed.status).toBe(200); const next = await renamed.json();
    expect((await fetch(`${base}/artifacts/${value.id}?revision=${value.revision}`, { method: 'DELETE', headers })).status).toBe(409);
    expect((await fetch(`${base}/artifacts/${value.id}?revision=${next.revision}`, { method: 'DELETE', headers })).status).toBe(200);
  } finally { await new Promise(resolve => server.close(resolve)); }
}));
