import assert from 'node:assert/strict';
import test from 'node:test';
import { networkGrants, originGrants, parseConfig } from '../src/config.js';

test('defaults to no private origin grants', () => {
  const config = parseConfig({});

  assert.deepEqual(config, { chromePath: null, brokerUrl: null, allowedOrigins: [], allowedNetworks: [], discoverDevServers: false, idleTimeoutMs: 1_800_000 });
  assert.deepEqual(originGrants(config.allowedOrigins), []);
});

test('bounds idle profile expiry between one minute and one day', () => {
  assert.equal(parseConfig({ idleTimeoutMs: 60_000 }).idleTimeoutMs, 60_000);
  assert.equal(parseConfig({ idleTimeoutMs: 86_400_000 }).idleTimeoutMs, 86_400_000);
  for (const idleTimeoutMs of [null, 0, -1, 59_999, 86_400_001, '60000', 60_000.5]) {
    assert.throws(() => parseConfig({ idleTimeoutMs }), /config.idleTimeoutMs/);
  }
});

test('accepts only the plain HTTP loopback brokerUrl the client can dial', () => {
  assert.equal(parseConfig({ brokerUrl: 'http://127.0.0.1:3001' }).brokerUrl, 'http://127.0.0.1:3001');
  for (const brokerUrl of ['', '   ', 'https://localhost:9443', 'http://localhost:3001', 'http://[::1]:3001', 'http://example.com:3001', 'http://127.0.0.1:3001/path', 'file:///tmp/socket', 7]) {
    assert.throws(() => parseConfig({ brokerUrl }), /config\.brokerUrl must be a non-empty plain HTTP loopback URL on 127\.0\.0\.1/);
  }
});

test('normalizes explicit origins into exact host and port grants', () => {
  const config = parseConfig({
    chromePath: '/opt/chrome',
    allowedOrigins: ['http://localhost:3000', 'https://device.example'],
  });

  assert.equal(config.chromePath, '/opt/chrome');
  assert.deepEqual(originGrants(config.allowedOrigins), [
    { host: 'localhost', port: 3000, protocol: 'http:' },
    { host: 'device.example', port: 443, protocol: 'https:' },
  ]);
});

test('rejects allowlist entries that are not exact http origins', () => {
  assert.throws(
    () => parseConfig({ allowedOrigins: ['http://localhost:3000/private'] }),
    /must be an http\(s\) origin/,
  );
  assert.throws(
    () => parseConfig({ allowedOrigins: ['file:///tmp/page.html'] }),
    /must be an http\(s\) origin/,
  );
});

test('parses private network blocks with explicit ports and ranges', () => {
  const config = parseConfig({ allowedNetworks: [{ cidr: '192.168.1.0/24', ports: [3000, '5173-5199', '8080'] }] });
  const [grant] = networkGrants(config.allowedNetworks);

  assert.deepEqual(config.allowedNetworks[0].ports, [[3000, 3000], [5173, 5199], [8080, 8080]]);
  assert.equal(grant.block.check('192.168.1.20', 'ipv4'), true);
  assert.equal(grant.block.check('192.168.2.20', 'ipv4'), false);
});

test('rejects network blocks that are public, too broad, or missing explicit ports', () => {
  for (const network of [
    { cidr: '8.8.8.0/24', ports: [3000] },
    { cidr: '10.0.0.0/7', ports: [3000] },
    { cidr: '192.168.1.0/24' },
    { cidr: '192.168.1.0/24', ports: ['*'] },
    { cidr: '192.168.1.0/24', ports: ['3000-2000'] },
  ]) {
    assert.throws(() => parseConfig({ allowedNetworks: [network] }), /config\.allowedNetworks\[0\]/);
  }
});


test('turns development-server discovery on only with an explicit boolean', () => {
  assert.equal(parseConfig({ discoverDevServers: true }).discoverDevServers, true);
  assert.throws(() => parseConfig({ discoverDevServers: 'yes' }), /discoverDevServers must be true or false/);
});
