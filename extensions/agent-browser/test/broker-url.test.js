import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { brokerConfigPath, resolveBrokerUrl } from '../src/main.js';
import { brokerConfigPath as bundledBrokerConfigPath } from '../dist/service/main.js';

const withConfig = async (config, run) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'agent-browser-config-'));
  const configPath = path.join(directory, 'config.json');
  if (config !== undefined) await writeFile(configPath, typeof config === 'string' ? config : JSON.stringify(config));
  try {
    await run(configPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

test('the service environment broker URL wins over config.json', async () => {
  await withConfig({ brokerUrl: 'http://127.0.0.1:4004' }, async (configPath) => {
    assert.equal(
      resolveBrokerUrl({ env: { OPENCHAMBER_BROWSER_BROKER_URL: 'http://127.0.0.1:5005' }, configPath }),
      'http://127.0.0.1:5005',
    );
  });
});

test('config.json brokerUrl is used when the environment variable is absent', async () => {
  await withConfig({ brokerUrl: 'http://127.0.0.1:4004' }, async (configPath) => {
    assert.equal(resolveBrokerUrl({ env: {}, configPath }), 'http://127.0.0.1:4004');
    assert.equal(
      resolveBrokerUrl({ env: { OPENCHAMBER_BROWSER_BROKER_URL: '' }, configPath }),
      'http://127.0.0.1:4004',
    );
  });
});

test('the loopback default is used when neither source configures a broker URL', async () => {
  await withConfig(undefined, async (configPath) => {
    assert.equal(resolveBrokerUrl({ env: {}, configPath }), 'http://127.0.0.1:3001');
  });
  await withConfig({}, async (configPath) => {
    assert.equal(resolveBrokerUrl({ env: {}, configPath }), 'http://127.0.0.1:3001');
  });
});

test('an invalid environment broker URL fails loudly instead of falling back', async () => {
  await withConfig({ brokerUrl: 'http://127.0.0.1:4004' }, async (configPath) => {
    assert.throws(
      () => resolveBrokerUrl({ env: { OPENCHAMBER_BROWSER_BROKER_URL: 'http://127.0.0.1:3001/extra' }, configPath }),
      /OPENCHAMBER_BROWSER_BROKER_URL must be a plain HTTP loopback URL on 127\.0\.0\.1/,
    );
    assert.throws(
      () => resolveBrokerUrl({ env: { OPENCHAMBER_BROWSER_BROKER_URL: 'https://127.0.0.1:3001' }, configPath }),
      /OPENCHAMBER_BROWSER_BROKER_URL/,
    );
  });
});

test('an unusable config.json brokerUrl fails loudly instead of silently defaulting', async () => {
  for (const brokerUrl of ['http://example.com:3001', 'https://127.0.0.1:3001', 'http://127.0.0.1:3001/path']) {
    await withConfig({ brokerUrl }, async (configPath) => {
      assert.throws(() => resolveBrokerUrl({ env: {}, configPath }), /config\.brokerUrl/);
    });
  }
});

test('an unreadable config.json payload fails loudly', async () => {
  await withConfig('{ not json', async (configPath) => {
    assert.throws(() => resolveBrokerUrl({ env: {}, configPath }), /Invalid JSON in .*config\.json/);
  });
});

test('the service resolves config.json one directory above its entry', () => {
  const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  assert.equal(brokerConfigPath(), path.join(extensionDir, 'config.json'));
  // The installed layout is `<extensionRoot>/service/main.js`, so the bundled
  // import.meta.url must resolve one directory up from dist/service.
  assert.equal(bundledBrokerConfigPath(), path.join(extensionDir, 'dist', 'config.json'));
});
