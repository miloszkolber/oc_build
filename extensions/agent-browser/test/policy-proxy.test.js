import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
import test from 'node:test';
import { classifyProxyTarget, createPolicyProxy } from '../src/policy-proxy.js';

const listen = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

const close = (server) => new Promise((resolve) => server.close(resolve));

const socketReader = (socket) => {
  let buffer = Buffer.alloc(0);
  let ended = socket.destroyed;
  const waiters = new Set();
  const flush = () => {
    for (const waiter of [...waiters]) {
      const length = waiter.match(buffer);
      if (length === null) continue;
      const value = buffer.subarray(0, length);
      buffer = buffer.subarray(length);
      waiters.delete(waiter);
      waiter.resolve(value);
    }
  };
  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    flush();
  });
  socket.on('close', () => {
    ended = true;
    for (const waiter of waiters) waiter.reject(new Error('Socket closed before the expected bytes arrived'));
    waiters.clear();
  });
  const read = (match) => new Promise((resolve, reject) => {
    const waiter = { match, resolve, reject };
    waiters.add(waiter);
    flush();
    if (ended && waiters.has(waiter)) {
      waiters.delete(waiter);
      reject(new Error('Socket closed before the expected bytes arrived'));
    }
  });
  return {
    until: (delimiter) => {
      const expected = Buffer.from(delimiter);
      return read((value) => {
        const index = value.indexOf(expected);
        return index < 0 ? null : index + expected.length;
      });
    },
    bytes: (length) => read((value) => value.length < length ? null : length),
  };
};

const connectSocket = async (port) => {
  const client = net.connect({ host: '127.0.0.1', port });
  const reader = socketReader(client);
  await new Promise((resolve, reject) => {
    client.once('connect', resolve);
    client.once('error', reject);
  });
  return { client, reader };
};

const connectTunnel = async (port, authority, { host = authority, head = '', headers = '' } = {}) => {
  const connection = await connectSocket(port);
  const request = Buffer.from(`CONNECT ${authority} HTTP/1.1\r\nHost: ${host}\r\n${headers}\r\n`);
  connection.client.write(Buffer.concat([request, Buffer.isBuffer(head) ? head : Buffer.from(head)]));
  const response = await connection.reader.until('\r\n\r\n');
  return { ...connection, response: response.toString('latin1') };
};

const WEBSOCKET_KEY = Buffer.from('0123456789abcdef').toString('base64');
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const websocketAccept = (key = WEBSOCKET_KEY) => createHash('sha1').update(`${key}${WEBSOCKET_GUID}`).digest('base64');
const websocketRequest = (authority, {
  path = '/socket',
  requestTarget = path,
  key = WEBSOCKET_KEY,
  protocols = [],
  extensions = [],
} = {}) => Buffer.from(
  `GET ${requestTarget} HTTP/1.1\r\nHost: ${authority}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n${protocols.map((value) => `Sec-WebSocket-Protocol: ${value}\r\n`).join('')}${extensions.map((value) => `Sec-WebSocket-Extensions: ${value}\r\n`).join('')}\r\n`,
);

const socketClosed = (socket) => (socket.destroyed
  ? Promise.resolve()
  : new Promise((resolve) => socket.once('close', resolve)));

test('denies private destinations unless their exact host and port are allowed', async () => {
  const lookup = async () => [{ address: '127.0.0.1', family: 4 }];

  const denied = await classifyProxyTarget('http://local.test:4123/', { lookup });
  const allowed = await classifyProxyTarget('http://local.test:4123/', {
    lookup,
    grants: [{ host: 'local.test', port: 4123, protocol: 'http:' }],
  });
  const wrongScheme = await classifyProxyTarget('https://local.test:4123/', {
    lookup,
    grants: [{ host: 'local.test', port: 4123, protocol: 'http:' }],
  });
  const websocket = await classifyProxyTarget('ws://local.test:4123/socket', {
    lookup,
    grants: [{ host: 'local.test', port: 4123, protocol: 'http:' }],
  });

  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'Private or loopback address requires an allowed origin');
  assert.equal(allowed.allowed, true);
  assert.equal(allowed.address, '127.0.0.1');
  assert.equal(wrongScheme.allowed, false);
  assert.equal(websocket.allowed, true);
});

test('allows a private network block only on its listed ports', async () => {
  const block = new net.BlockList();
  block.addSubnet('192.168.1.0', 24, 'ipv4');
  const grants = [{ block, ports: [[3000, 3200]] }];

  const allowed = await classifyProxyTarget('https://192.168.1.20:3100/', { grants });
  const otherPort = await classifyProxyTarget('http://192.168.1.20:22/', { grants });
  const otherNetwork = await classifyProxyTarget('http://192.168.2.20:3100/', { grants });
  const loopback = await classifyProxyTarget('http://localhost:3100/', {
    grants,
    lookup: async () => [{ address: '127.0.0.1', family: 4 }],
  });

  assert.equal(allowed.allowed, true);
  assert.deepEqual([otherPort.allowed, otherNetwork.allowed, loopback.allowed], [false, false, false]);
});

test('denies a hostname when any DNS answer is unsafe', async () => {
  const lookup = async () => [
    { address: '93.184.216.34', family: 4 },
    { address: '169.254.169.254', family: 4 },
  ];

  const decision = await classifyProxyTarget('https://rebinding.test/', { lookup });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'IPv4 link-local addresses are denied');
});

test('explains how to allow a blocked private origin', async (context) => {
  const proxy = createPolicyProxy({ configPath: '/extension/config.json' });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const response = await new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: proxyPort, path: 'http://192.168.1.21:3100/app' }, resolve).once('error', reject);
  });
  response.setEncoding('utf8');
  let body = '';
  for await (const chunk of response) body += chunk;

  assert.equal(response.statusCode, 403);
  assert.match(response.headers['content-type'], /^text\/html/);
  assert.match(response.headers['content-security-policy'], /default-src 'none'/);
  assert.match(body, /<title>Blocked: http:\/\/192\.168\.1\.21:3100<\/title>/);
  assert.ok(body.includes('<code>/extension/config.json</code>'));
  assert.ok(body.includes('[&#34;http://192.168.1.21:3100&#34;]'));
});

test('closes an HTTP upstream when its browser connection aborts', async (context) => {
  const upstreamAccepted = Promise.withResolvers();
  const upstreamClosed = Promise.withResolvers();
  const upstream = http.createServer(() => {});
  upstream.on('connection', (socket) => {
    upstreamAccepted.resolve();
    socket.once('close', () => upstreamClosed.resolve());
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({ grants: [{ host: '127.0.0.1', port: upstreamPort, protocol: 'http:' }] });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const request = http.request({
    host: '127.0.0.1', port: proxyPort, method: 'GET',
    path: `http://127.0.0.1:${upstreamPort}/never-finishes`,
  });
  request.on('error', () => {});
  request.end();

  await upstreamAccepted.promise;
  request.destroy();

  await upstreamClosed.promise;
  assert.equal(request.destroyed, true);
});

test('does not open an upstream after the browser aborts during DNS lookup', async (context) => {
  const lookupStarted = Promise.withResolvers();
  const lookupResult = Promise.withResolvers();
  let upstreamConnections = 0;
  const upstream = net.createServer((socket) => {
    upstreamConnections += 1;
    socket.destroy();
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'deferred.test', port: upstreamPort, protocol: 'http:' }],
    lookup: async () => {
      lookupStarted.resolve();
      return lookupResult.promise;
    },
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const request = http.request({
    host: '127.0.0.1', port: proxyPort, method: 'GET',
    path: `http://deferred.test:${upstreamPort}/deferred`,
  });
  request.on('error', () => {});
  request.end();

  await lookupStarted.promise;
  const requestClosed = new Promise((resolve) => request.once('close', resolve));
  request.destroy();
  await requestClosed;
  await new Promise((resolve) => setImmediate(resolve));
  lookupResult.resolve([{ address: '127.0.0.1', family: 4 }]);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(upstreamConnections, 0);
});

test('propagates browser aborts to development-server discovery', { timeout: 10_000 }, async (context) => {
  const discoveryStarted = Promise.withResolvers();
  const discoveryResult = Promise.withResolvers();
  let discoverySignal;
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    devServerGrants: (signal) => {
      discoverySignal = signal;
      discoveryStarted.resolve();
      return new Promise((resolve, reject) => {
        const cleanup = () => signal?.removeEventListener('abort', onAbort);
        const onAbort = () => {
          cleanup();
          reject(signal.reason);
        };
        if (signal?.aborted) return onAbort();
        signal?.addEventListener('abort', onAbort, { once: true });
        discoveryResult.promise.then((value) => {
          cleanup();
          resolve(value);
        }, (error) => {
          cleanup();
          reject(error);
        });
      });
    },
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const request = http.get({
    host: '127.0.0.1',
    port: Number(proxyAddress.split(':').at(-1)),
    path: `http://localhost:${upstreamPort}/discovery`,
    agent: false,
  });
  request.on('error', () => {});
  request.end();
  await discoveryStarted.promise;

  const requestClosed = socketClosed(request.socket);
  const discoveryAborted = new Promise((resolve) => discoverySignal.addEventListener('abort', resolve, { once: true }));
  request.destroy();
  await Promise.all([requestClosed, discoveryAborted]);
  assert.equal(discoverySignal.aborted, true);
  discoveryResult.resolve([{ host: '127.0.0.1', port: upstreamPort }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamConnections, 0);
});

test('returns 504 for stalled HTTP classification and never connects after its late result', { timeout: 10_000 }, async (context) => {
  const lookupStarted = Promise.withResolvers();
  const lookupResult = Promise.withResolvers();
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'deferred.test', port: upstreamPort, protocol: 'http:' }],
    lookup: async () => {
      lookupStarted.resolve();
      return lookupResult.promise;
    },
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const responsePromise = new Promise((resolve, reject) => {
    const request = http.get({
      host: '127.0.0.1',
      port: Number(proxyAddress.split(':').at(-1)),
      path: `http://deferred.test:${upstreamPort}/stalled`,
      agent: false,
    }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
  });
  await lookupStarted.promise;

  assert.equal(await responsePromise, 504);
  lookupResult.resolve([{ address: '127.0.0.1', family: 4 }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamConnections, 0);
});

test('keeps timed-out classifier work bounded and rejects overload until it settles', { timeout: 15_000 }, async (context) => {
  const pendingLookups = [];
  const lookupsStarted = Promise.withResolvers();
  let lookupCalls = 0;
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'deferred.test', port: upstreamPort, protocol: 'http:' }],
    lookup: (_hostname, { signal }) => {
      lookupCalls += 1;
      if (lookupCalls > 32) return Promise.resolve([{ address: '203.0.113.1', family: 4 }]);
      const result = Promise.withResolvers();
      pendingLookups.push({ ...result, signal });
      if (pendingLookups.length === 32) lookupsStarted.resolve();
      return result.promise;
    },
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const startRequest = () => new Promise((resolve, reject) => {
    const request = http.get({
      host: '127.0.0.1',
      port: proxyPort,
      path: `http://deferred.test:${upstreamPort}/stalled`,
      agent: false,
    }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
  });

  const firstBatch = Array.from({ length: 32 }, startRequest);
  await lookupsStarted.promise;
  assert.deepEqual(await Promise.all(firstBatch), Array(32).fill(504));
  assert.equal(lookupCalls, 32);
  assert.ok(pendingLookups.every(({ signal }) => signal?.aborted), 'classification timeout must abort dependency signals');

  for (let batch = 0; batch < 4; batch += 1) {
    assert.deepEqual(await Promise.all(Array.from({ length: 32 }, startRequest)), Array(32).fill(503));
    assert.equal(lookupCalls, 32, 'saturated classification must not invoke another lookup');
    assert.equal(upstreamConnections, 0);
  }

  for (const lookup of pendingLookups) lookup.resolve([{ address: '127.0.0.1', family: 4 }]);
  await Promise.all(pendingLookups.map(({ promise }) => promise));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamConnections, 0, 'late results from canceled requests must never open an upstream');
  assert.equal(await startRequest(), 403, 'a settled classifier slot can be reused');
  assert.equal(lookupCalls, 33);
  assert.equal(upstreamConnections, 0);
});

test('close waits for a pending listen and prevents the listener from binding afterward', async () => {
  const proxy = createPolicyProxy();
  const listening = proxy.listen();
  const closing = proxy.close();

  await closing;
  await assert.rejects(listening, /Browser proxy is closed/);
  assert.equal(proxy.address, null);
  await proxy.close();
  await assert.rejects(proxy.listen(), /Browser proxy is closed/);
});

test('bounds in-flight ordinary HTTP requests and releases admission when a caller aborts', { timeout: 10_000 }, async (context) => {
  const lookupLimitReached = Promise.withResolvers();
  const lookupAfterAbort = Promise.withResolvers();
  const lookupResult = Promise.withResolvers();
  let lookupCalls = 0;
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'admission.test', port: upstreamPort, protocol: 'http:' }],
    lookup: async (_hostname, { signal }) => {
      lookupCalls += 1;
      if (lookupCalls === 32) lookupLimitReached.resolve();
      if (lookupCalls === 33) lookupAfterAbort.resolve();
      return new Promise((resolve, reject) => {
        const cleanup = () => signal?.removeEventListener('abort', onAbort);
        const onAbort = () => {
          cleanup();
          reject(signal.reason);
        };
        if (signal?.aborted) return onAbort();
        signal?.addEventListener('abort', onAbort, { once: true });
        lookupResult.promise.then((value) => {
          cleanup();
          resolve(value);
        }, (error) => {
          cleanup();
          reject(error);
        });
      });
    },
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const startRequest = () => {
    const result = Promise.withResolvers();
    const request = http.get({
      host: '127.0.0.1',
      port: proxyPort,
      path: `http://admission.test:${upstreamPort}/pending`,
      agent: false,
    }, (response) => {
      response.resume();
      response.once('end', () => result.resolve(response.statusCode));
    });
    request.once('error', () => result.resolve(null));
    return { request, response: result.promise };
  };
  const requests = Array.from({ length: 32 }, startRequest);
  context.after(() => {
    lookupResult.resolve([{ address: '127.0.0.1', family: 4 }]);
    for (const { request } of requests) request.destroy();
  });
  await lookupLimitReached.promise;

  const overloaded = startRequest();
  assert.equal(await overloaded.response, 503);
  const abortedSocket = requests[0].request.socket;
  const abortedClosed = socketClosed(abortedSocket);
  requests[0].request.destroy();
  await abortedClosed;
  await new Promise((resolve) => setImmediate(resolve));

  const replacement = startRequest();
  const replacementOutcome = await Promise.race([
    lookupAfterAbort.promise.then(() => 'classified'),
    replacement.response.then((status) => `response:${status}`),
  ]);
  assert.equal(replacementOutcome, 'classified');
  replacement.request.destroy();
  for (const { request } of requests.slice(1)) request.destroy();
  lookupResult.resolve([{ address: '127.0.0.1', family: 4 }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamConnections, 0);
});

test('enforces the HTTP upstream connection deadline without timing out an established stream', { timeout: 15_000 }, async (context) => {
  const stalledSocketCreated = Promise.withResolvers();
  const httpAgent = new http.Agent({ keepAlive: false });
  httpAgent.createConnection = () => {
    const socket = new net.Socket();
    // Keep a real ClientRequest in its socket-assignment phase without dialing a fixture or public host.
    socket.connecting = true;
    stalledSocketCreated.resolve();
    return socket;
  };
  context.after(() => httpAgent.destroy());
  let unexpectedConnections = 0;
  const dialTarget = http.createServer(() => {});
  dialTarget.on('connection', () => { unexpectedConnections += 1; });
  const dialPort = await listen(dialTarget);
  context.after(() => close(dialTarget));
  const dialProxy = createPolicyProxy({
    grants: [{ host: '127.0.0.1', port: dialPort, protocol: 'http:' }],
    httpAgent,
  });
  const dialAddress = await dialProxy.listen();
  context.after(() => dialProxy.close());
  const dialResponse = new Promise((resolve, reject) => {
    const request = http.get({
      host: '127.0.0.1',
      port: Number(dialAddress.split(':').at(-1)),
      path: `http://127.0.0.1:${dialPort}/dial-timeout`,
      agent: false,
    }, (response) => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
  });
  await stalledSocketCreated.promise;
  assert.equal(await dialResponse, 504);
  assert.equal(unexpectedConnections, 0);

  const streamStarted = Promise.withResolvers();
  let streamResponse;
  const streamingUpstream = http.createServer((_request, response) => {
    streamResponse = response;
    response.write('started');
    streamStarted.resolve();
  });
  const streamingPort = await listen(streamingUpstream);
  context.after(() => close(streamingUpstream));
  const streamingProxy = createPolicyProxy({ grants: [{ host: '127.0.0.1', port: streamingPort, protocol: 'http:' }] });
  const streamingAddress = await streamingProxy.listen();
  context.after(() => streamingProxy.close());
  let streamedBody = '';
  const streamingResponsePromise = new Promise((resolve, reject) => {
    const request = http.get({
      host: '127.0.0.1',
      port: Number(streamingAddress.split(':').at(-1)),
      path: `http://127.0.0.1:${streamingPort}/stream`,
      agent: false,
    }, (response) => {
      response.setEncoding('utf8');
      response.on('data', (chunk) => { streamedBody += chunk; });
      response.once('end', () => resolve(response));
      response.once('error', reject);
    });
    request.once('error', reject);
  });
  await streamStarted.promise;
  await new Promise((resolve) => setTimeout(resolve, 5_200));
  assert.equal(streamResponse.writableEnded, false, 'the connection deadline must not become a response timeout');
  streamResponse.end('finished');
  await streamingResponsePromise;
  assert.equal(streamedBody, 'startedfinished');
});

test('closes a CONNECT upstream when its browser socket closes', async (context) => {
  const upstreamAccepted = Promise.withResolvers();
  const upstreamClosed = Promise.withResolvers();
  const upstream = net.createServer((socket) => {
    upstreamAccepted.resolve();
    socket.once('close', () => upstreamClosed.resolve());
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({ grants: [{ host: '127.0.0.1', port: upstreamPort, protocol: 'https:' }] });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const client = net.connect({ host: '127.0.0.1', port: proxyPort });
  const connected = Promise.withResolvers();
  client.on('data', (chunk) => {
    if (chunk.toString().includes('200 Connection Established')) connected.resolve();
  });
  client.write(`CONNECT 127.0.0.1:${upstreamPort} HTTP/1.1\r\nHost: 127.0.0.1:${upstreamPort}\r\n\r\n`);

  await upstreamAccepted.promise;
  await connected.promise;
  client.destroy();

  await upstreamClosed.promise;
  assert.equal(client.destroyed, true);
});

test('gates HTTP-only WebSocket CONNECTs and relays a validated upgrade', async (context) => {
  const upstreamRequest = Promise.withResolvers();
  const upstreamInitialTail = Promise.withResolvers();
  const allowUpgrade = Promise.withResolvers();
  const upstreamClosed = Promise.withResolvers();
  const upstream = net.createServer((socket) => {
    let received = Buffer.alloc(0);
    let upgraded = false;
    socket.on('close', () => upstreamClosed.resolve());
    socket.on('data', (chunk) => {
      if (upgraded) {
        socket.write(chunk);
        return;
      }
      received = Buffer.concat([received, chunk]);
      const end = received.indexOf('\r\n\r\n');
      if (end < 0) return;
      upstreamRequest.resolve(received.subarray(0, end + 4).toString('latin1'));
      const remainder = received.subarray(end + 4);
      upstreamInitialTail.resolve(Buffer.from(remainder));
      void allowUpgrade.promise.then(() => {
        upgraded = true;
        socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${websocketAccept()}\r\n\r\n`);
        if (remainder.length > 0) socket.write(remainder);
      });
    });
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'ws-only.test', port: upstreamPort, protocol: 'http:' }],
    lookup: async () => [{ address: '127.0.0.1', family: 4 }],
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const authority = `ws-only.test:${upstreamPort}`;
  const { client, reader, response } = await connectTunnel(proxyPort, authority);
  assert.match(response, /^HTTP\/1\.1 200 Connection Established/);

  const frame = Buffer.from([0x81, 0x01, 0x41]);
  const key = WEBSOCKET_KEY;
  const handshake = Buffer.from(`GET /socket?room=one HTTP/1.1\r\nHost: ${authority}\r\nUpgrade: WebSocket\r\nConnection: keep-alive, Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nOrigin: https://not-granted.test\r\nX-Test: preserved\r\nProxy-Connection: keep-alive\r\n\r\n`);
  client.write(Buffer.concat([handshake, frame]));

  const forwarded = await upstreamRequest.promise;
  assert.deepEqual(await upstreamInitialTail.promise, Buffer.alloc(0), 'client frames must wait for a valid upstream 101');
  allowUpgrade.resolve();
  const switching = await reader.until('\r\n\r\n');
  assert.match(switching.toString('latin1'), /^HTTP\/1\.1 101 Switching Protocols/);
  assert.deepEqual(await reader.bytes(frame.length), frame);
  assert.match(forwarded, /^GET \/socket\?room=one HTTP\/1\.1\r\n/);
  assert.ok(forwarded.includes(`Host: ${authority}\r\n`));
  assert.ok(forwarded.includes('Connection: Upgrade\r\n'));
  assert.ok(forwarded.includes('Upgrade: websocket\r\n'));
  assert.ok(forwarded.includes(`Sec-WebSocket-Key: ${key}\r\n`));
  assert.ok(forwarded.includes('Origin: https://not-granted.test\r\n'));
  assert.ok(forwarded.includes('X-Test: preserved\r\n'));
  assert.equal(forwarded.includes('keep-alive, Upgrade'), false);
  assert.equal(forwarded.toLowerCase().includes('proxy-connection'), false);

  client.destroy();
  await upstreamClosed.promise;
});

test('validates direct ws proxy upgrades before connecting and relays only after a valid 101', async (context) => {
  const upstreamRequest = Promise.withResolvers();
  const upstreamInitialTail = Promise.withResolvers();
  const allowUpgrade = Promise.withResolvers();
  const upstreamClosed = Promise.withResolvers();
  const upstream = net.createServer((socket) => {
    let received = Buffer.alloc(0);
    let upgraded = false;
    socket.once('close', () => upstreamClosed.resolve());
    socket.on('data', (chunk) => {
      if (upgraded) {
        socket.write(chunk);
        return;
      }
      received = Buffer.concat([received, chunk]);
      const end = received.indexOf('\r\n\r\n');
      if (end < 0) return;
      const remainder = Buffer.from(received.subarray(end + 4));
      upstreamRequest.resolve(received.subarray(0, end + 4).toString('latin1'));
      upstreamInitialTail.resolve(remainder);
      void allowUpgrade.promise.then(() => {
        upgraded = true;
        socket.write(Buffer.concat([
          Buffer.from(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${websocketAccept()}\r\n\r\n`),
          serverFrame,
        ]));
        if (remainder.length > 0) socket.write(remainder);
      });
    });
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'ws-only.test', port: upstreamPort, protocol: 'http:' }],
    lookup: async () => [{ address: '127.0.0.1', family: 4 }],
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const authority = `ws-only.test:${upstreamPort}`;
  const { client, reader } = await connectSocket(proxyPort);
  const clientFrame = Buffer.from([0x81, 0x01, 0x43]);
  const serverFrame = Buffer.from([0x81, 0x01, 0x53]);
  const request = Buffer.from(`GET http://${authority}/direct HTTP/1.1\r\nHost: ${authority}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${WEBSOCKET_KEY}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  client.write(Buffer.concat([request, clientFrame]));

  const forwarded = await upstreamRequest.promise;
  assert.deepEqual(await upstreamInitialTail.promise, Buffer.alloc(0), 'direct client frames must wait for a validated upstream 101');
  allowUpgrade.resolve();
  assert.match((await reader.until('\r\n\r\n')).toString('latin1'), /^HTTP\/1\.1 101 Switching Protocols/);
  assert.deepEqual(await reader.bytes(serverFrame.length), serverFrame);
  assert.deepEqual(await reader.bytes(clientFrame.length), clientFrame);
  assert.match(forwarded, /^GET \/direct HTTP\/1\.1\r\n/);
  assert.ok(forwarded.includes(`Host: ${authority}\r\n`));
  assert.ok(forwarded.includes(`Sec-WebSocket-Key: ${WEBSOCKET_KEY}\r\n`));

  client.destroy();
  await upstreamClosed.promise;
});

test('direct WebSocket upgrades reject invalid upstream negotiation without exposing 101 or client bytes', { timeout: 15_000 }, async (context) => {
  const responseQueue = [];
  const connectionWaiters = [];
  const upstreamRecords = [];
  const serverFrame = Buffer.from([0x81, 0x01, 0x53]);
  const upstream = net.createServer((socket) => {
    const response = responseQueue.shift();
    const forwarded = [];
    const forwardedWaiter = Promise.withResolvers();
    const record = { requestReceived: Promise.withResolvers(), forwarded, forwardedWaiter };
    upstreamRecords.push(record);
    connectionWaiters.shift()?.(record);
    let received = Buffer.alloc(0);
    let requestParsed = false;
    socket.on('data', (chunk) => {
      if (requestParsed) {
        forwarded.push(Buffer.from(chunk));
        forwardedWaiter.resolve();
        return;
      }
      received = Buffer.concat([received, chunk]);
      const end = received.indexOf('\r\n\r\n');
      if (end < 0) return;
      requestParsed = true;
      record.requestReceived.resolve({
        header: received.subarray(0, end + 4).toString('latin1'),
        tail: Buffer.from(received.subarray(end + 4)),
      });
      if (response) socket.write(Buffer.concat([Buffer.from(response), serverFrame]));
    });
  });
  const waitForTarget = () => new Promise((resolve) => connectionWaiters.push(resolve));
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'ws-only.test', port: upstreamPort, protocol: 'http:' }],
    lookup: async () => [{ address: '127.0.0.1', family: 4 }],
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const authority = `ws-only.test:${upstreamPort}`;
  const validHeaders = `Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${websocketAccept()}\r\n`;
  const invalidResponses = [
    {
      label: 'unoffered subprotocol',
      response: `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Protocol: chat\r\n\r\n`,
      requestOptions: {},
    },
    {
      label: 'unoffered extension',
      response: `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Extensions: permessage-deflate\r\n\r\n`,
      requestOptions: {},
    },
    {
      label: 'missing offered server_no_context_takeover',
      response: `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Extensions: permessage-deflate\r\n\r\n`,
      requestOptions: { extensions: ['permessage-deflate; server_no_context_takeover'] },
    },
    {
      label: 'missing offered server_max_window_bits',
      response: `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Extensions: permessage-deflate\r\n\r\n`,
      requestOptions: { extensions: ['permessage-deflate; server_max_window_bits=12'] },
    },
    {
      label: 'unoffered client_max_window_bits',
      response: `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits=10\r\n\r\n`,
      requestOptions: { extensions: ['permessage-deflate'] },
    },
  ];
  const clientFrame = Buffer.from([0x81, 0x01, 0x43]);

  for (const { label, response, requestOptions } of invalidResponses) {
    responseQueue.push(response);
    const { client, reader } = await connectSocket(proxyPort);
    const clientBytes = [];
    client.on('data', (chunk) => clientBytes.push(Buffer.from(chunk)));
    const target = waitForTarget();
    client.write(Buffer.concat([
      websocketRequest(authority, { ...requestOptions, requestTarget: `http://${authority}/direct` }),
      clientFrame,
    ]));
    const record = await target;
    const request = await record.requestReceived.promise;
    assert.deepEqual(request.tail, Buffer.alloc(0), `${label}: queued client bytes must wait for a valid 101`);
    assert.match((await reader.until('\r\n\r\n')).toString('latin1'), /^HTTP\/1\.1 502 Bad Gateway/, label);
    await socketClosed(client);
    const exposed = Buffer.concat(clientBytes);
    assert.equal(exposed.toString('latin1').includes('101 Switching Protocols'), false, `${label}: upstream 101 must not reach the client`);
    assert.equal(exposed.includes(serverFrame), false, `${label}: upstream frame must not reach the client`);
    assert.equal(Buffer.concat(record.forwarded).length, 0, `${label}: queued client bytes must not reach upstream`);
  }

  for (const selectedClientWindow of ['', '; client_max_window_bits=15']) {
    responseQueue.push(`HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Extensions: permessage-deflate${selectedClientWindow}\r\n\r\n`);
    const { client, reader } = await connectSocket(proxyPort);
    const target = waitForTarget();
    client.write(Buffer.concat([
      websocketRequest(authority, {
        requestTarget: `http://${authority}/direct`,
        extensions: ['permessage-deflate; client_max_window_bits=10'],
      }),
      clientFrame,
    ]));
    const record = await target;
    assert.deepEqual((await record.requestReceived.promise).tail, Buffer.alloc(0));
    assert.match((await reader.until('\r\n\r\n')).toString('latin1'), /^HTTP\/1\.1 101 Switching Protocols/);
    assert.deepEqual(await reader.bytes(serverFrame.length), serverFrame);
    await record.forwardedWaiter.promise;
    assert.deepEqual(Buffer.concat(record.forwarded), clientFrame, 'numeric client_max_window_bits offers are hints the server may ignore');
    client.destroy();
    await socketClosed(client);
  }
  assert.equal(upstreamRecords.length, invalidResponses.length + 2);
});

test('rejects malformed direct ws Upgrade requests before any upstream connection', async (context) => {
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'ws-only.test', port: upstreamPort, protocol: 'http:' }],
    lookup: async () => [{ address: '127.0.0.1', family: 4 }],
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const authority = `ws-only.test:${upstreamPort}`;
  const { client, reader } = await connectSocket(Number(proxyAddress.split(':').at(-1)));
  client.write(`GET http://${authority}/broken HTTP/1.1\r\nHost: ${authority}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  assert.match((await reader.until('\r\n\r\n')).toString('latin1'), /^HTTP\/1\.1 400 Bad Request/);
  await socketClosed(client);
  assert.equal(upstreamConnections, 0);
});

test('HTTP-only CONNECT rejects invalid upstream WebSocket handshakes without relaying early client data', { timeout: 15_000 }, async (context) => {
  const responseQueue = [];
  const connectionWaiters = [];
  const upstreamRecords = [];
  const upstream = net.createServer((socket) => {
    const response = responseQueue.shift();
    const requestReceived = Promise.withResolvers();
    const record = { requestReceived, forwarded: [], closed: new Promise((resolve) => socket.once('close', resolve)) };
    upstreamRecords.push(record);
    connectionWaiters.shift()?.(record);
    let received = Buffer.alloc(0);
    let requestParsed = false;
    socket.on('data', (chunk) => {
      if (requestParsed) {
        record.forwarded.push(Buffer.from(chunk));
        return;
      }
      received = Buffer.concat([received, chunk]);
      const end = received.indexOf('\r\n\r\n');
      if (end < 0) return;
      requestParsed = true;
      requestReceived.resolve({
        header: received.subarray(0, end + 4).toString('latin1'),
        tail: Buffer.from(received.subarray(end + 4)),
      });
      if (typeof response === 'string' && response.length > 0) socket.write(response);
    });
  });
  const waitForTarget = () => new Promise((resolve) => connectionWaiters.push(resolve));
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({ grants: [{ host: '127.0.0.1', port: upstreamPort, protocol: 'http:' }] });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const authority = `127.0.0.1:${upstreamPort}`;
  const validHeaders = `Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${websocketAccept()}\r\n`;
  const invalidResponses = [
    ['200 with body', `HTTP/1.1 200 OK\r\nContent-Length: 4\r\n\r\nnope`],
    ['wrong accept', `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: wrong\r\n\r\n`],
    ['missing accept', 'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n'],
    ['bad upgrade', `HTTP/1.1 101 Switching Protocols\r\nUpgrade: h2c\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${websocketAccept()}\r\n\r\n`],
    ['bad connection', `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: keep-alive\r\nSec-WebSocket-Accept: ${websocketAccept()}\r\n\r\n`],
    ['duplicate accept', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Accept: ${websocketAccept()}\r\n\r\n`],
    ['content length', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Content-Length: 0\r\n\r\n`],
    ['transfer encoding', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Transfer-Encoding: chunked\r\n\r\n`],
    ['folded header', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders} Upgrade: websocket\r\n\r\n`],
    ['oversized header', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}X-Large: ${'a'.repeat(17_000)}\r\n\r\n`],
    ['unoffered subprotocol', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Protocol: chat\r\n\r\n`],
    ['multiple selected subprotocols', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Protocol: chat, superchat\r\n\r\n`],
    ['duplicate selected subprotocol', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Protocol: chat\r\nSec-WebSocket-Protocol: chat\r\n\r\n`],
    ['unsolicited extension', `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Extensions: permessage-deflate\r\n\r\n`],
  ];
  const earlyFrame = Buffer.from([0x81, 0x01, 0x41]);

  const assertRejected = async (label, response, requestOptions = {}) => {
    responseQueue.push(response);
    const { client, response: connectResponse } = await connectTunnel(proxyPort, authority);
    assert.match(connectResponse, /^HTTP\/1\.1 200 Connection Established/);
    client.on('error', () => {});
    const target = waitForTarget();
    client.write(Buffer.concat([websocketRequest(authority, requestOptions), earlyFrame]));
    const record = await target;
    const request = await record.requestReceived.promise;
    assert.deepEqual(request.tail, Buffer.alloc(0), `${label}: early client bytes cannot reach upstream before its 101`);
    await socketClosed(client);
    assert.equal(Buffer.concat(record.forwarded).length, 0, `${label}: invalid upstream handshake must not enable duplex relay`);
    await record.closed;
  };

  for (const [label, response] of invalidResponses) await assertRejected(label, response);
  await assertRejected(
    'unmatched extension parameter',
    `HTTP/1.1 101 Switching Protocols\r\n${validHeaders}Sec-WebSocket-Extensions: permessage-deflate; server_max_window_bits=15\r\n\r\n`,
    { extensions: ['permessage-deflate; server_max_window_bits=12'] },
  );

  const timeoutAttempts = [];
  for (const response of ['HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n', null]) {
    responseQueue.push(response);
    const { client, response: connectResponse } = await connectTunnel(proxyPort, authority);
    assert.match(connectResponse, /^HTTP\/1\.1 200 Connection Established/);
    client.on('error', () => {});
    const target = waitForTarget();
    client.write(Buffer.concat([websocketRequest(authority), earlyFrame]));
    timeoutAttempts.push({ client, target });
  }
  const timeoutRecords = await Promise.all(timeoutAttempts.map(async ({ target }) => {
    const record = await target;
    const request = await record.requestReceived.promise;
    assert.deepEqual(request.tail, Buffer.alloc(0));
    return record;
  }));
  await Promise.all(timeoutAttempts.map(({ client }) => socketClosed(client)));
  for (const record of timeoutRecords) {
    assert.equal(Buffer.concat(record.forwarded).length, 0, 'timed-out handshake must not relay early client data');
    await record.closed;
  }
  assert.equal(upstreamRecords.length, invalidResponses.length + 1 + timeoutAttempts.length);
});

test('accepts an offered WebSocket subprotocol and valid permessage-deflate parameters', async (context) => {
  const upstreamRequest = Promise.withResolvers();
  const upstreamTail = Promise.withResolvers();
  const upstreamClosed = Promise.withResolvers();
  const serverResponse = `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${websocketAccept()}\r\nSec-WebSocket-Protocol: chat\r\nSec-WebSocket-Extensions: permessage-deflate; client_max_window_bits=10; server_max_window_bits=10; client_no_context_takeover; server_no_context_takeover\r\n\r\n`;
  const upstream = net.createServer((socket) => {
    let received = Buffer.alloc(0);
    let requestParsed = false;
    socket.once('close', () => upstreamClosed.resolve());
    socket.on('data', (chunk) => {
      if (requestParsed) {
        socket.write(chunk);
        return;
      }
      received = Buffer.concat([received, chunk]);
      const end = received.indexOf('\r\n\r\n');
      if (end < 0) return;
      requestParsed = true;
      const header = received.subarray(0, end + 4).toString('latin1');
      const tail = Buffer.from(received.subarray(end + 4));
      upstreamRequest.resolve(header);
      upstreamTail.resolve(tail);
      socket.write(serverResponse);
    });
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({ grants: [{ host: '127.0.0.1', port: upstreamPort, protocol: 'http:' }] });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const authority = `127.0.0.1:${upstreamPort}`;
  const { client, reader, response } = await connectTunnel(Number(proxyAddress.split(':').at(-1)), authority);
  assert.match(response, /^HTTP\/1\.1 200 Connection Established/);
  const frame = Buffer.from([0x81, 0x01, 0x41]);
  client.write(Buffer.concat([websocketRequest(authority, {
    protocols: ['chat, superchat'],
    extensions: ['permessage-deflate; client_max_window_bits'],
  }), frame]));

  const forwarded = await upstreamRequest.promise;
  assert.deepEqual(await upstreamTail.promise, Buffer.alloc(0), 'early client data must wait for a valid negotiated 101');
  assert.match(forwarded, /Sec-WebSocket-Protocol: chat, superchat\r\n/);
  assert.match(forwarded, /Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits\r\n/);
  const switching = (await reader.until('\r\n\r\n')).toString('latin1');
  assert.match(switching, /^HTTP\/1\.1 101 Switching Protocols/);
  assert.match(switching, /Sec-WebSocket-Protocol: chat\r\n/);
  assert.match(switching, /Sec-WebSocket-Extensions: permessage-deflate; client_max_window_bits=10; server_max_window_bits=10; client_no_context_takeover; server_no_context_takeover\r\n/);
  assert.deepEqual(await reader.bytes(frame.length), frame);

  client.destroy();
  await upstreamClosed.promise;
});

test('HTTP-only CONNECT rejects non-WebSocket or malformed tunnel bytes without forwarding them', { timeout: 12_000 }, async (context) => {
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: '127.0.0.1', port: upstreamPort, protocol: 'http:' }],
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const authority = `127.0.0.1:${upstreamPort}`;
  const key = WEBSOCKET_KEY;
  const malformed = [
    ['raw TLS head', Buffer.from([0x16, 0x03, 0x01, 0x00, 0x05, 0x01]), true],
    ['binary head', Buffer.from([0x00, 0xff, 0x16]), true],
    ['bare line feed', `GET / HTTP/1.1\nHost: ${authority}\n\n`, false],
    ['folded header', `GET / HTTP/1.1\r\nHost: ${authority}\r\n Upgrade: websocket\r\n\r\n`, false],
    ['wrong Host', `GET / HTTP/1.1\r\nHost: other.test:${upstreamPort}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`, false],
    ['missing upgrade', `GET / HTTP/1.1\r\nHost: ${authority}\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`, false],
    ['invalid key', `GET / HTTP/1.1\r\nHost: ${authority}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: not-a-key\r\nSec-WebSocket-Version: 13\r\n\r\n`, false],
    ['invalid version', `GET / HTTP/1.1\r\nHost: ${authority}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 12\r\n\r\n`, false],
    ['duplicate Host', `GET / HTTP/1.1\r\nHost: ${authority}\r\nHost: ${authority}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`, false],
    ['request body framing', `GET / HTTP/1.1\r\nHost: ${authority}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nContent-Length: 0\r\n\r\n`, false],
    ['oversize header', `GET / HTTP/1.1\r\nHost: ${authority}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nX-Oversize: ${'a'.repeat(17_000)}\r\n\r\n`, false],
  ];

  for (const [name, payload, sendAsHead] of malformed) {
    const { client, response } = await connectTunnel(proxyPort, authority, { head: sendAsHead ? payload : '' });
    assert.match(response, /^HTTP\/1\.1 200 Connection Established/, `${name} must be gated only after CONNECT is authorized`);
    client.on('error', () => {});
    if (!sendAsHead) client.write(payload);
    await socketClosed(client);
  }

  const empty = await connectTunnel(proxyPort, authority);
  const incomplete = await connectTunnel(proxyPort, authority);
  empty.client.on('error', () => {});
  incomplete.client.on('error', () => {});
  incomplete.client.write(`GET / HTTP/1.1\r\nHost: ${authority}\r\n`);
  await Promise.all([socketClosed(empty.client), socketClosed(incomplete.client)]);
  assert.equal(upstreamConnections, 0, 'malformed, empty and timed-out requests must not open upstream sockets');
});

test('strictly checks CONNECT authority and Host before connecting; HTTP grants do not authorize other hosts or ports', async (context) => {
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    grants: [{ host: 'ws-only.test', port: upstreamPort, protocol: 'http:' }],
    lookup: async () => [{ address: '127.0.0.1', family: 4 }],
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const authority = `ws-only.test:${upstreamPort}`;

  const mismatchedHost = await connectTunnel(proxyPort, authority, { host: `other.test:${upstreamPort}` });
  assert.match(mismatchedHost.response, /^HTTP\/1\.1 400 Bad Request/);
  mismatchedHost.client.destroy();
  const framedConnect = await connectSocket(proxyPort);
  framedConnect.client.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\nContent-Length: 0\r\n\r\n`);
  assert.match((await framedConnect.reader.until('\r\n\r\n')).toString('latin1'), /^HTTP\/1\.1 400 Bad Request/);
  framedConnect.client.destroy();
  const duplicatedHost = await connectSocket(proxyPort);
  duplicatedHost.client.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\nHost: ${authority}\r\n\r\n`);
  assert.match((await duplicatedHost.reader.until('\r\n\r\n')).toString('latin1'), /^HTTP\/1\.1 400 Bad Request/);
  duplicatedHost.client.destroy();

  for (const target of [`other.test:${upstreamPort}`, `ws-only.test:${upstreamPort + 1}`]) {
    const { client, reader } = await connectSocket(proxyPort);
    client.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\nOrigin: http://${authority}\r\n\r\n`);
    assert.match((await reader.until('\r\n\r\n')).toString('latin1'), /^HTTP\/1\.1 403 Forbidden/);
    client.destroy();
  }
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamConnections, 0);
});

test('keeps opaque HTTPS CONNECT behavior and forwards CONNECT head bytes', async (context) => {
  const payload = Buffer.from([0x16, 0x03, 0x01, 0x00, 0x04, 0xde, 0xad, 0xbe, 0xef]);
  const received = Promise.withResolvers();
  const upstreamClosed = Promise.withResolvers();
  const upstream = net.createServer((socket) => {
    socket.once('close', () => upstreamClosed.resolve());
    socket.on('data', (chunk) => {
      received.resolve(Buffer.from(chunk));
      socket.write(chunk);
    });
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({ grants: [{ host: '127.0.0.1', port: upstreamPort, protocol: 'https:' }] });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));

  const { client, reader, response } = await connectTunnel(proxyPort, `127.0.0.1:${upstreamPort}`, { head: payload });
  assert.match(response, /^HTTP\/1\.1 200 Connection Established/);
  assert.deepEqual(await received.promise, payload);
  assert.deepEqual(await reader.bytes(payload.length), payload);
  client.destroy();
  await upstreamClosed.promise;
});

test('times out a stalled CONNECT classification and does not connect later', { timeout: 10_000 }, async (context) => {
  const lookupStarted = Promise.withResolvers();
  const lookupResult = Promise.withResolvers();
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({
    lookup: async () => {
      lookupStarted.resolve();
      return lookupResult.promise;
    },
  });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const { client, reader } = await connectSocket(Number(proxyAddress.split(':').at(-1)));
  client.write(`CONNECT deferred.test:${upstreamPort} HTTP/1.1\r\nHost: deferred.test:${upstreamPort}\r\n\r\n`);
  await lookupStarted.promise;

  const response = await reader.until('\r\n\r\n');
  assert.match(response.toString('latin1'), /^HTTP\/1\.1 504 Gateway Timeout/);
  await socketClosed(client);
  lookupResult.resolve([{ address: '127.0.0.1', family: 4 }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamConnections, 0);
});

test('bounds pending WebSocket-gated CONNECTs', { timeout: 10_000 }, async (context) => {
  let upstreamConnections = 0;
  const upstream = net.createServer(() => { upstreamConnections += 1; });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({ grants: [{ host: '127.0.0.1', port: upstreamPort, protocol: 'http:' }] });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const authority = `127.0.0.1:${upstreamPort}`;
  const clients = await Promise.all(Array.from({ length: 33 }, () => connectSocket(proxyPort)));
  for (const { client } of clients) client.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`);
  const responses = await Promise.all(clients.map(({ reader }) => reader.until('\r\n\r\n')));
  const statuses = responses.map((response) => response.toString('latin1').split('\r\n', 1)[0]);
  assert.equal(statuses.filter((status) => status === 'HTTP/1.1 200 Connection Established').length, 32);
  assert.equal(statuses.filter((status) => status === 'HTTP/1.1 503 Service Unavailable').length, 1);
  assert.equal(upstreamConnections, 0, 'pending client handshakes must not connect to the target');

  await Promise.all(clients.map(({ client }) => socketClosed(client)));
  const next = await connectTunnel(proxyPort, authority);
  assert.match(next.response, /^HTTP\/1\.1 200 Connection Established/);
  next.client.destroy();
  await socketClosed(next.client);
  assert.equal(upstreamConnections, 0);
  await proxy.close();
});

test('aborting classification and shutting down a gated CONNECT release both sockets', async (context) => {
  const lookupStarted = Promise.withResolvers();
  const lookupResult = Promise.withResolvers();
  let abortedUpstreamConnections = 0;
  const abortedUpstream = net.createServer(() => { abortedUpstreamConnections += 1; });
  const abortedPort = await listen(abortedUpstream);
  context.after(() => close(abortedUpstream));
  const abortProxy = createPolicyProxy({
    grants: [{ host: 'deferred.test', port: abortedPort, protocol: 'https:' }],
    lookup: async () => {
      lookupStarted.resolve();
      return lookupResult.promise;
    },
  });
  const abortAddress = await abortProxy.listen();
  context.after(() => abortProxy.close());
  const abortClient = net.connect({ host: '127.0.0.1', port: Number(abortAddress.split(':').at(-1)) });
  abortClient.on('error', () => {});
  abortClient.write(`CONNECT deferred.test:${abortedPort} HTTP/1.1\r\nHost: deferred.test:${abortedPort}\r\n\r\n`);
  await lookupStarted.promise;
  const abortedClosed = socketClosed(abortClient);
  abortClient.destroy();
  await abortedClosed;
  lookupResult.resolve([{ address: '127.0.0.1', family: 4 }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(abortedUpstreamConnections, 0);
  await abortProxy.close();

  const upstreamClosed = Promise.withResolvers();
  const upstreamHandshake = Promise.withResolvers();
  let upstreamConnections = 0;
  const upstream = net.createServer((socket) => {
    upstreamConnections += 1;
    let request = Buffer.alloc(0);
    socket.once('close', () => upstreamClosed.resolve());
    socket.on('data', (chunk) => {
      request = Buffer.concat([request, chunk]);
      if (request.includes('\r\n\r\n')) upstreamHandshake.resolve();
    });
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({ grants: [{ host: '127.0.0.1', port: upstreamPort, protocol: 'http:' }] });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const { client, response } = await connectTunnel(Number(proxyAddress.split(':').at(-1)), `127.0.0.1:${upstreamPort}`);
  assert.match(response, /^HTTP\/1\.1 200 Connection Established/);
  client.write(websocketRequest(`127.0.0.1:${upstreamPort}`));
  await upstreamHandshake.promise;
  assert.equal(upstreamConnections, 1);
  const clientClosed = socketClosed(client);
  await proxy.close();
  await clientClosed;
  await upstreamClosed.promise;
});

test('survives repeated CONNECT aborts while the upstream is writing', { timeout: 10_000 }, async (context) => {
  const fixture = new URL('./fixtures/policy-proxy-epipe.js', import.meta.url);
  const child = spawn(process.execPath, [fixture.pathname], { stdio: ['ignore', 'pipe', 'pipe'] });
  context.after(() => {
    if (child.exitCode === null) child.kill();
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });

  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });

  assert.equal(code, 0, stderr);
  assert.match(stdout, /completed without uncaught socket error/);
});


test('grants discovered development servers on loopback and asks for them only when needed', async () => {
  // Given a dev server on IPv4 5173 and another only on IPv6 4321.
  const scans = [];
  const devServerGrants = async () => {
    scans.push('scan');
    return [{ host: '127.0.0.1', port: 5173 }, { host: '::1', port: 4321 }];
  };
  const bothFamilies = async () => [{ address: '::1', family: 6 }, { address: '127.0.0.1', family: 4 }];

  // When a public site loads, then nothing is scanned.
  const publicSite = await classifyProxyTarget('https://example.test/', {
    devServerGrants,
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
  });
  assert.equal(publicSite.allowed, true);
  assert.deepEqual(scans, []);

  // When localhost is requested, then it pins to whichever loopback family has the server.
  const vite = await classifyProxyTarget('http://localhost:5173/', { devServerGrants, lookup: bothFamilies });
  const websocket = await classifyProxyTarget('ws://localhost:5173/socket', { devServerGrants, lookup: bothFamilies });
  const ipv6Only = await classifyProxyTarget('http://localhost:4321/', { devServerGrants, lookup: bothFamilies });
  const undiscovered = await classifyProxyTarget('http://127.0.0.1:37737/', { devServerGrants });
  const https = await classifyProxyTarget('https://localhost:5173/', { devServerGrants, lookup: bothFamilies });
  const secureWebsocket = await classifyProxyTarget('wss://localhost:5173/socket', { devServerGrants, lookup: bothFamilies });
  assert.deepEqual([vite.allowed, vite.address], [true, '127.0.0.1']);
  assert.deepEqual([websocket.allowed, websocket.address], [true, '127.0.0.1']);
  assert.deepEqual([ipv6Only.allowed, ipv6Only.address], [true, '::1']);
  assert.equal(undiscovered.allowed, false);
  assert.deepEqual([https.allowed, secureWebsocket.allowed], [false, false]);
});

test('discovered loopback listeners allow ordinary HTTP and valid ws upgrades', async (context) => {
  const upstream = http.createServer((request, response) => {
    response.end(`ordinary:${request.url}`);
  });
  const upstreamSockets = new Set();
  upstream.on('connection', (socket) => {
    upstreamSockets.add(socket);
    socket.once('close', () => upstreamSockets.delete(socket));
  });
  upstream.on('upgrade', (request, socket, head) => {
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${websocketAccept(request.headers['sec-websocket-key'])}\r\n\r\n`);
    if (head.length > 0) socket.write(head);
    socket.on('data', (chunk) => socket.write(chunk));
  });
  const upstreamPort = await listen(upstream);
  const proxy = createPolicyProxy({ devServerGrants: async () => [{ host: '127.0.0.1', port: upstreamPort }] });
  const proxyAddress = await proxy.listen();
  // Close the proxy first so it tears down the bridge before the fixture.
  context.after(async () => {
    await proxy.close();
    // server.close() does not include upgraded connections, so reap the
    // fixture-side WebSocket explicitly before awaiting server shutdown.
    for (const socket of upstreamSockets) socket.destroy();
    await close(upstream);
  });
  const proxyPort = Number(proxyAddress.split(':').at(-1));
  const authority = `127.0.0.1:${upstreamPort}`;

  const response = await new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: proxyPort, path: `http://${authority}/ordinary` }, resolve).once('error', reject);
  });
  response.setEncoding('utf8');
  let body = '';
  for await (const chunk of response) body += chunk;
  assert.deepEqual([response.statusCode, body], [200, 'ordinary:/ordinary']);

  const { client, reader } = await connectSocket(proxyPort);
  const frame = Buffer.from([0x81, 0x01, 0x41]);
  client.write(Buffer.concat([websocketRequest(authority, { requestTarget: `http://${authority}/socket` }), frame]));
  assert.match((await reader.until('\r\n\r\n')).toString('latin1'), /^HTTP\/1\.1 101 Switching Protocols/);
  assert.deepEqual(await reader.bytes(frame.length), frame);
  client.destroy();
});

test('discovered HTTP listener cannot turn HTTPS CONNECT into an opaque raw tunnel', async (context) => {
  let upstreamConnections = 0;
  const upstream = net.createServer((socket) => {
    upstreamConnections += 1;
    socket.on('data', () => socket.destroy());
  });
  const upstreamPort = await listen(upstream);
  context.after(() => close(upstream));
  const proxy = createPolicyProxy({ devServerGrants: async () => [{ host: '127.0.0.1', port: upstreamPort }] });
  const proxyAddress = await proxy.listen();
  context.after(() => proxy.close());
  const authority = `127.0.0.1:${upstreamPort}`;
  const tlsHead = Buffer.from([0x16, 0x03, 0x01, 0x00, 0x05, 0x01]);

  const { client, response } = await connectTunnel(Number(proxyAddress.split(':').at(-1)), authority, { head: tlsHead });
  assert.match(response, /^HTTP\/1\.1 200 Connection Established/);
  await socketClosed(client);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamConnections, 0, 'raw TLS bytes must be rejected by the WebSocket-only gate before upstream connect');
});

test('explicit origin grants match the exact requested hostname', async () => {
  // Given a literal loopback origin grant, and a name that resolves to the same address.
  const origin = { grants: [{ host: '127.0.0.1', port: 5173, protocol: 'http:' }] };
  const discovery = { devServerGrants: async () => [{ host: '127.0.0.1', port: 5173 }] };
  const lookup = async () => [{ address: '127.0.0.1', family: 4 }];

  // A private address grant allows its literal hostname but not a different origin hostname.
  const literal = await classifyProxyTarget('http://127.0.0.1:5173/', origin);
  const localhostAlias = await classifyProxyTarget('http://localhost:5173/', { ...origin, lookup });
  assert.equal(literal.allowed, true);
  assert.deepEqual([localhostAlias.allowed, localhostAlias.reason], [false, 'Private or loopback address requires an allowed origin']);

  // Localhost is allowed when it has a distinct, explicit origin grant.
  const explicitLocalhost = await classifyProxyTarget('http://localhost:5173/', {
    grants: [...origin.grants, { host: 'localhost', port: 5173, protocol: 'http:' }],
    lookup,
  });
  assert.deepEqual([explicitLocalhost.allowed, explicitLocalhost.address], [true, '127.0.0.1']);

  const localhostGrant = [{ host: 'localhost', port: 5173, protocol: 'http:' }];
  const dottedAlias = await classifyProxyTarget('http://localhost.:5173/', { grants: localhostGrant, lookup });
  assert.deepEqual([dottedAlias.allowed, dottedAlias.reason], [false, 'Private or loopback address requires an allowed origin']);
  const explicitDottedOrigin = await classifyProxyTarget('http://localhost.:5173/', {
    grants: [{ host: 'localhost.', port: 5173, protocol: 'http:' }],
    lookup,
  });
  assert.deepEqual([explicitDottedOrigin.allowed, explicitDottedOrigin.address], [true, '127.0.0.1']);

  // An unrelated hostname remains blocked even when it resolves to a granted address.
  for (const policy of [origin, discovery]) {
    const alias = await classifyProxyTarget('http://rebind.test:5173/', { ...policy, lookup });
    assert.deepEqual([alias.allowed, alias.reason], [false, 'Private or loopback address requires an allowed origin']);
  }

  // When a name resolves into a listed network block, then the block still allows it by address.
  const block = new net.BlockList();
  block.addSubnet('192.168.1.0', 24, 'ipv4');
  const nas = await classifyProxyTarget('http://nas.test:3100/', {
    grants: [{ block, ports: [[3000, 3200]] }],
    lookup: async () => [{ address: '192.168.1.20', family: 4 }],
  });
  assert.equal(nas.allowed, true);
});

test('points a blocked loopback address at development-server discovery', async (context) => {
  for (const [devServerGrants, expected] of [[null, /"discoverDevServers": true/], [async () => [], /discovery is on/]]) {
    const proxy = createPolicyProxy({ devServerGrants });
    const proxyAddress = await proxy.listen();
    context.after(() => proxy.close());
    const response = await new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port: Number(proxyAddress.split(':').at(-1)), path: 'http://127.0.0.1:3999/' }, resolve).once('error', reject);
    });
    response.setEncoding('utf8');
    let body = '';
    for await (const chunk of response) body += chunk;
    assert.match(body, expected);
  }
});
