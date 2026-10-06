import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { LatestClient, latestCandidate, promoteLatest, readLabelsFile, selectLatest } from './latest.mjs';
import { RegistryAuthError, discover } from './releases.mjs';

// Independent GitHub/OCI fixtures: ordering, labels, and exact publication bytes
// are asserted against this contract, not computed by the promotion implementation.
const image = 'ghcr.io/miloszkolber/openchamber';
const source = 'https://github.com/miloszkolber/openchamber';
const revision = 'e'.repeat(40);
const assetDigest = 'a'.repeat(64);
const indexType = 'application/vnd.oci.image.index.v1+json';
const manifestType = 'application/vnd.oci.image.manifest.v1+json';
const older = release('2.0.4', 398707683);
const newest = release('2.1.0', 400565502);

function release(version, id, overrides = {}) {
  return { id, tag_name: `v${version}`, draft: false, prerelease: version.includes('-'),
    published_at: '2026-09-25T12:00:00Z', assets: [{
      id: id + 100, name: `openchamber-web-${version}.tgz`, state: 'uploaded', size: 1000,
      browser_download_url: `https://github.com/openchamber/openchamber/releases/download/v${version}/openchamber-web-${version}.tgz`,
      digest: `sha256:${assetDigest}`,
    }], ...overrides };
}

function labels(record) {
  return {
    'org.opencontainers.image.source': source,
    'org.opencontainers.image.revision': revision,
    'org.opencontainers.image.version': record.tag_name.slice(1),
    'io.openchamber.upstream.release-id': String(record.id),
  };
}

function document(record, type = indexType, bytes) {
  const contents = type.includes('index') || type.includes('manifest.list') ? {
    manifests: [
      { mediaType: manifestType, digest: `sha256:${'b'.repeat(64)}`, size: 1234, platform: { os: 'linux', architecture: 'amd64' } },
      { mediaType: manifestType, digest: `sha256:${'c'.repeat(64)}`, size: 5678,
        platform: { os: 'unknown', architecture: 'unknown' },
        annotations: { 'vnd.docker.reference.type': 'attestation-manifest', 'vnd.docker.reference.digest': `sha256:${'b'.repeat(64)}` } },
    ],
  } : {
    config: { mediaType: 'application/vnd.oci.image.config.v1+json', digest: `sha256:${'b'.repeat(64)}`, size: 123 },
    layers: [{ mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip', digest: `sha256:${'c'.repeat(64)}`, size: 456 }],
  };
  const body = bytes ?? Buffer.from(` \n${JSON.stringify({ schemaVersion: 2, mediaType: type, ...contents,
    annotations: { fixture: record.tag_name, 'release-id': String(record.id), retained: 'unknown fields and original whitespace' } }, null, 3)}\n\n`);
  return { bytes: body, contentType: type, digest: `sha256:${createHash('sha256').update(body).digest('hex')}` };
}

function json(body, status = 200, headers = {}) {
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function fixture(pages = [[older, newest]], options = {}) {
  const requests = [];
  const inspections = [];
  const retained = new Map([...pages.flat(), ...(options.retained || [])].map(record => [String(record.id), record]));
  const documents = new Map();
  const canonical = new Map();
  const imageLabels = new Map();
  for (const record of retained.values()) {
    const doc = options.documents?.[record.id] || document(record);
    documents.set(doc.digest, doc);
    canonical.set(`${record.tag_name.slice(1)}-r${record.id}`, doc.digest);
    imageLabels.set(doc.digest, labels(record));
  }
  const oldDigest = canonical.get('2.0.4-r398707683');
  const newDigest = canonical.get('2.1.0-r400565502');
  const state = {
    pages, retained, documents, canonical, imageLabels, puts: [], scans: 0,
    alias: options.alias === undefined ? oldDigest ?? null : options.alias,
    repository: { full_name: 'miloszkolber/openchamber', private: true },
    // Observed GHCR metadata has no repository member; privacy remains independent.
    metadata: { name: 'openchamber', package_type: 'container', visibility: 'public' },
  };
  const client = new LatestClient({ token: 'fixture-github-secret', actor: 'fixture-actor', fetchImpl: async (address, init) => {
    const url = new URL(address);
    requests.push({ url: url.href, init });
    assert.equal(init.redirect, 'error');
    assert(init.signal instanceof AbortSignal);
    await options.onRequest?.(url, init, state, requests);
    if (url.origin === 'https://api.github.com') {
      assert.equal(init.headers.Authorization, 'Bearer fixture-github-secret');
      assert(!init.method || init.method === 'GET', 'GitHub is always read-only');
      if (url.pathname === '/repos/miloszkolber/openchamber') {
        return json(state.repository, options.repositoryStatus ?? 200);
      }
      if (url.pathname === '/users/miloszkolber/packages/container/openchamber') {
        return json(state.metadata, options.packageStatus ?? 200);
      }
      if (url.pathname === '/repos/openchamber/openchamber/releases') {
        assert.equal(url.searchParams.get('per_page'), '100');
        const page = Number(url.searchParams.get('page'));
        if (page === 1) state.scans += 1;
        assert(state.pages[page - 1], `Unexpected fixture page ${page}`);
        return json(state.pages[page - 1], 200, page < state.pages.length ? {
          link: `<https://api.github.com/repositories/1054790989/releases?per_page=100&page=${page + 1}>; rel="next"`,
        } : {});
      }
      const id = url.pathname.match(/^\/repos\/openchamber\/openchamber\/releases\/(\d+)$/)?.[1];
      if (id) return json(state.retained.get(id) ?? null, state.retained.has(id) ? 200 : 404);
      const commit = url.pathname.match(/^\/repos\/miloszkolber\/openchamber\/commits\/([a-f0-9]{40})$/)?.[1];
      if (commit) return json({ sha: options.commitSha ?? commit }, commit === revision ? options.commitStatus ?? 200 : 404);
    }
    if (url.origin === 'https://ghcr.io' && url.pathname === '/token') {
      const scope = url.searchParams.get('scope');
      assert(['repository:miloszkolber/openchamber:pull', 'repository:miloszkolber/openchamber:pull,push'].includes(scope));
      assert.equal(url.searchParams.get('service'), 'ghcr.io');
      assert.equal(init.headers.Authorization, `Basic ${Buffer.from('fixture-actor:fixture-github-secret').toString('base64')}`);
      return json({ token: scope.endsWith('pull,push') ? 'fixture-registry-write-secret' : 'fixture-registry-pull-secret' },
        scope.endsWith('pull,push') ? options.writeTokenStatus ?? 200 : options.tokenStatus ?? 200);
    }
    if (url.origin === 'https://ghcr.io' && url.pathname.startsWith('/v2/miloszkolber/openchamber/manifests/')) {
      const reference = url.pathname.split('/').at(-1);
      if (init.method === 'PUT') {
        assert.equal(reference, 'latest', 'Only the constant latest alias can be written');
        assert.equal(init.headers.Authorization, 'Bearer fixture-registry-write-secret');
        assert(Buffer.isBuffer(init.body), 'OCI body must be opaque bytes');
        state.puts.push({ bytes: Buffer.from(init.body), headers: init.headers });
        const hash = `sha256:${createHash('sha256').update(init.body).digest('hex')}`;
        if (options.acceptPut !== false) state.alias = hash;
        if (options.losePutResponse) throw new Error('fixture-registry-write-secret: response lost after acceptance');
        return json(null, options.putStatus ?? 201, { 'docker-content-digest': options.putHeaderDigest ?? hash });
      }
      assert.equal(init.headers.Authorization, 'Bearer fixture-registry-pull-secret');
      if (init.method === 'HEAD') {
        const found = reference === 'latest' ? state.alias : state.canonical.get(reference);
        return json(null, found ? 200 : 404, found ? {
          'docker-content-digest': found,
          'content-type': state.documents.get(found)?.contentType || indexType,
        } : {});
      }
      assert(!init.method || init.method === 'GET');
      assert(/^sha256:[a-f0-9]{64}$/.test(reference), 'Manifest GET must use a verified digest, not a mutable tag');
      const doc = state.documents.get(reference);
      assert(doc);
      return new Response(options.getBytes ?? doc.bytes, { status: options.getStatus ?? 200, headers: {
        'content-type': options.getContentType ?? doc.contentType,
        'docker-content-digest': options.getHeaderDigest ?? doc.digest,
      } });
    }
    throw new Error(`Unexpected fixture URL ${url.href}`);
  } });
  const inspect = async reference => {
    inspections.push(reference);
    assert(reference.startsWith(`${image}@sha256:`), 'All inspection pulls are digest-pinned');
    const value = state.imageLabels.get(reference.slice(image.length + 1));
    assert(value);
    await options.onInspect?.(reference, state);
    return structuredClone(value);
  };
  return { client, inspect, state, requests, inspections, oldDigest, newDigest };
}

test('stable selection fully paginates shuffled releases, ranks SemVer numerically, and excludes both prerelease signals', async () => {
  const records = [
    release('2.10.0', 700), release('2.9.9', 701),
    release('99.0.0', 702, { prerelease: true }),
    release('100.0.0-rc.1', 703, { prerelease: false }),
    release('200.0.0', 704, { draft: true, published_at: null, assets: null }),
    release('300.0.0', 705, { published_at: '2026-09-24T19:14:24Z' }),
  ];
  const f = fixture([[records[1], records[2], records[4]], [records[5], records[3], records[0]]]);
  assert.deepEqual(await selectLatest(f.client), {
    version: '2.10.0', release_id: '700', asset_sha256: assetDigest, published_at: '2026-09-25T12:00:00Z',
  });
  assert.equal(f.state.scans, 1);
  assert.equal(f.requests.length, 2, 'Selection scans releases, not image availability');
});

test('all three stable numeric components use BigInt rather than lossy numbers or lexical ordering', async () => {
  for (const [lower, higher] of [
    ['9007199254740992.0.0', '9007199254740993.0.0'],
    ['2.9007199254740992.0', '2.9007199254740993.0'],
    ['2.1.9007199254740992', '2.1.9007199254740993'],
  ]) {
    const f = fixture([[release(higher, 700)], [release(lower, 701)]]);
    assert.equal((await selectLatest(f.client)).version, higher);
  }
});

test('equal versions rank by publication time then numeric release ID, independent of page order', async () => {
  const f = fixture([
    [release('2.1.0', 900, { published_at: '2026-09-26T12:00:00Z' })],
    [release('2.1.0', 1000, { published_at: '2026-09-26T12:00:00Z' }),
      release('2.1.0', 2000, { published_at: '2026-09-25T12:00:00Z' })],
  ]);
  assert.equal((await selectLatest(f.client)).release_id, '1000');
});

test('missing/uploading assets remain pending and become latest-eligible only after upload', async () => {
  const missing = release('2.2.0', 410000001, { assets: [] });
  const uploading = release('2.3.0', 410000002);
  uploading.assets[0].state = 'starter';
  uploading.assets[0].size = 0;
  assert.equal((await selectLatest(fixture([[newest, missing, uploading]]).client)).version, '2.1.0');
  assert.equal((await selectLatest(fixture([[newest, release('2.2.0', 410000001), release('2.3.0', 410000002)]]).client)).version, '2.3.0');
});

test('a zero-build retained five-release backlog promotes 2.1.0 with its original publishing commit', async () => {
  const records = [release('2.0.1', 395994070), release('2.0.2', 397002711), release('2.0.3', 397868365), older, newest];
  const f = fixture([records.slice(3), records.slice(0, 3)], { alias: null });
  const built = await discover(f.client);
  assert.deepEqual(built.include, []);
  assert.equal(built.completed, 5);
  const candidate = await latestCandidate(f.client);
  const promoted = await promoteLatest(f.client, candidate, f.inspect);
  assert.equal(promoted.selected_release, '2.1.0-r400565502');
  assert.equal(promoted.publisher, revision, 'Retained publisher, not this workflow run SHA');
  assert.equal(promoted.outcome, 'published');
  assert.equal(promoted.previous_digest, '');
  assert.equal(f.state.alias, f.newDigest);
  assert.equal(f.state.puts.length, 1);
});

test('manual older discovery never narrows latest selection; a missing winning canonical waits without fallback', async () => {
  const f = fixture();
  assert.equal((await discover(f.client, { releaseId: '398707683' })).completed, 1);
  assert.equal((await latestCandidate(f.client)).release_id, '400565502');
  f.state.canonical.delete('2.1.0-r400565502');
  const waiting = await latestCandidate(f.client);
  assert.equal(waiting.outcome, 'waiting');
  assert.equal(waiting.release_id, '400565502');
  assert.equal(waiting.digest, '');
  assert.equal(waiting.previous_digest, f.oldDigest);
  await assert.rejects(promoteLatest(f.client, waiting, f.inspect), /Only a ready/);
  assert.equal(f.state.puts.length, 0);
  assert.equal(f.state.alias, f.oldDigest);
});

test('no eligible stable release retains the alias without attempting publication', async () => {
  const f = fixture([[release('3.0.0-beta.1', 500000001)]], { alias: null });
  const candidate = await latestCandidate(f.client);
  assert.equal(candidate.outcome, 'empty');
  assert.equal(candidate.selected_release, '');
  assert.equal(f.state.puts.length, 0);
});

test('a delayed older run is rejected after a newer selection; a fresh run selects and promotes the winner', async () => {
  const f = fixture([[older]], { retained: [newest], alias: null });
  const slow = await latestCandidate(f.client);
  f.state.pages = [[newest, older]];
  await assert.rejects(promoteLatest(f.client, slow, f.inspect), /selection changed/);
  assert.equal(f.state.puts.length, 0);
  const fresh = await latestCandidate(f.client);
  const promoted = await promoteLatest(f.client, fresh, f.inspect);
  assert.equal(promoted.version, '2.1.0');
  assert.equal(f.state.alias, f.newDigest);
});

test('a newer retained current alias cannot be downgraded even if it disappears from the release list', async () => {
  const f = fixture([[older]], { retained: [newest] });
  f.state.alias = f.newDigest;
  const candidate = await latestCandidate(f.client);
  await assert.rejects(promoteLatest(f.client, candidate, f.inspect), /Refusing to downgrade/);
  assert.equal(f.state.puts.length, 0);
  assert.equal(f.state.alias, f.newDigest);
});

test('an identical alias is a verified no-op with no manifest GET, push scope, or PUT', async () => {
  const f = fixture();
  f.state.alias = f.newDigest;
  const candidate = await latestCandidate(f.client);
  const result = await promoteLatest(f.client, candidate, f.inspect);
  assert.equal(result.outcome, 'unchanged');
  assert.equal(result.publisher, revision);
  assert.equal(result.previous_digest, f.newDigest);
  assert.deepEqual(f.inspections, [`${image}@${f.newDigest}`]);
  assert.equal(f.state.puts.length, 0);
  assert(!f.requests.some(({ url }) => url.includes('pull%2Cpush')));
  assert(!f.requests.some(({ url, init }) => url.includes('/manifests/sha256:') && !init.method));
});

test('OCI indexes with attestations and single manifests are copied byte-for-byte with original media type and length', async () => {
  for (const type of [indexType, manifestType,
    'application/vnd.docker.distribution.manifest.list.v2+json', 'application/vnd.docker.distribution.manifest.v2+json']) {
    const doc = document(newest, type);
    doc.contentType += '; charset=utf-8';
    const f = fixture(undefined, { documents: { [newest.id]: doc } });
    const candidate = await latestCandidate(f.client);
    const result = await promoteLatest(f.client, candidate, f.inspect);
    assert.equal(result.outcome, 'published');
    assert.equal(result.previous_digest, f.oldDigest);
    assert.deepEqual(f.inspections, [`${image}@${doc.digest}`, `${image}@${f.oldDigest}`]);
    assert.equal(f.state.puts.length, 1);
    assert.deepEqual(f.state.puts[0].bytes, doc.bytes);
    assert.equal(f.state.puts[0].headers['Content-Type'], doc.contentType);
    assert.equal(f.state.puts[0].headers['Content-Length'], String(doc.bytes.length));
    assert.equal(f.state.alias, doc.digest);
    assert.equal(f.state.canonical.get('2.1.0-r400565502'), doc.digest);
    const put = f.requests.findIndex(({ init }) => init.method === 'PUT');
    assert(f.requests.slice(put + 1).some(({ url, init }) => url.endsWith('/manifests/2.1.0-r400565502') && init.method === 'HEAD'));
    assert(f.requests.slice(put + 1).some(({ url }) => url.endsWith('/packages/container/openchamber')));
  }
});

test('an accepted PUT with a lost response is reconciled by one latest readback, not replayed', async () => {
  const f = fixture(undefined, { losePutResponse: true });
  const result = await promoteLatest(f.client, await latestCandidate(f.client), f.inspect);
  assert.equal(result.outcome, 'published-reconciled');
  assert.equal(f.state.puts.length, 1);
  const put = f.requests.findIndex(({ init }) => init.method === 'PUT');
  assert.equal(f.requests.slice(put + 1).filter(({ url, init }) => url.endsWith('/manifests/latest') && init.method === 'HEAD').length, 1);
  assert.equal(f.state.alias, f.newDigest);
});

test('failed or unconfirmed PUTs read back once and never restore/retry a stale alias', async () => {
  for (const options of [
    { losePutResponse: true, acceptPut: false },
    { putStatus: 403, acceptPut: false },
    { putHeaderDigest: `sha256:${'f'.repeat(64)}`, acceptPut: false },
  ]) {
    const f = fixture(undefined, options);
    await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect), error => {
      assert.match(error.message, /publication is uncertain/);
      assert.equal(error.latest.outcome, 'uncertain');
      assert.equal(error.latest.previous_digest, f.oldDigest);
      assert.equal(error.latest.publisher, revision);
      return true;
    });
    assert.equal(f.state.puts.length, 1);
    assert.equal(f.state.alias, f.oldDigest);
    const put = f.requests.findIndex(({ init }) => init.method === 'PUT');
    assert.equal(f.requests.slice(put + 1).filter(({ url, init }) => url.endsWith('/manifests/latest') && init.method === 'HEAD').length, 1);
  }
});

test('accepted publication with failed canonical/privacy verification is reported as published but unverified', async () => {
  for (const change of ['canonical', 'privacy', 'readback']) {
    const f = fixture(undefined, { onRequest(url, init, state) {
      if (state.puts.length === 0) return;
      if (change === 'canonical' && url.pathname.endsWith('/manifests/2.1.0-r400565502') && init.method === 'HEAD') {
        state.canonical.delete('2.1.0-r400565502');
      }
      if (change === 'privacy' && url.pathname.endsWith('/packages/container/openchamber')) state.metadata.visibility = 'private';
      if (change === 'readback' && url.pathname.endsWith('/manifests/latest')) throw new Error('fixture-secret readback transport failure');
    } });
    await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect), error => {
      assert.equal(error.latest.outcome, change === 'readback' ? 'uncertain' : 'published-unverified');
      assert.equal(error.latest.publisher, revision);
      assert(!error.message.includes('fixture-secret'));
      return true;
    });
    assert.equal(f.state.puts.length, 1, 'No automatic restore or replay after incomplete verification');
    assert.equal(f.state.alias, f.newDigest);
  }
});

test('package privacy and repository identity fail closed before any PUT, as do both registry scopes', async () => {
  for (const mutation of [
    state => { state.metadata.visibility = 'private'; },
    state => { state.metadata.repository = { full_name: 'other/openchamber', private: true }; },
  ]) {
    const f = fixture();
    const candidate = await latestCandidate(f.client);
    mutation(f.state);
    await assert.rejects(promoteLatest(f.client, candidate, f.inspect), /private|different repository/);
    assert.equal(f.state.puts.length, 0);
  }
  // The public build repository is not a failure: privacy is a package property.
  {
    const f = fixture();
    const candidate = await latestCandidate(f.client);
    f.state.repository.private = false;
    assert.equal((await promoteLatest(f.client, candidate, f.inspect)).outcome, 'published');
  }
  for (const options of [{ repositoryStatus: 403 }, { packageStatus: 404 }, { tokenStatus: 401 }, { tokenStatus: 403 }]) {
    const f = fixture(undefined, options);
    await assert.rejects(latestCandidate(f.client));
    assert.equal(f.state.puts.length, 0);
  }
  const f = fixture(undefined, { writeTokenStatus: 403 });
  await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect), RegistryAuthError);
  assert.equal(f.state.puts.length, 0);
});

test('privacy is rechecked after inspection and before the final selection/PUT', async () => {
  let metadataReads = 0;
  const f = fixture(undefined, { onRequest(url, _init, state) {
    if (url.pathname.endsWith('/packages/container/openchamber') && ++metadataReads === 3) state.metadata.visibility = 'private';
  } });
  await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect), /private/);
  assert.equal(f.state.puts.length, 0);
});

test('candidate labels require exact source/version/release ID and a retained commit resolving in the private repository', async () => {
  for (const [key, value] of [
    ['org.opencontainers.image.source', 'https://github.com/openchamber/openchamber'],
    ['org.opencontainers.image.version', '2.0.4'],
    ['io.openchamber.upstream.release-id', '398707683'],
    ['org.opencontainers.image.revision', 'f'.repeat(40)],
    ['org.opencontainers.image.revision', `${revision}\nINJECT=yes`],
  ]) {
    const f = fixture();
    f.state.imageLabels.get(f.newDigest)[key] = value;
    await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect), /source|version|release ID|commit/);
    assert.equal(f.state.puts.length, 0);
  }
  const f = fixture(undefined, { commitSha: 'f'.repeat(40) });
  await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect), /does not resolve/);
  assert.equal(f.state.puts.length, 0);
});

test('a rebuilt release may refresh a stale latest alias without being treated as a downgrade', async () => {
  // Rebuilding replaces the canonical tag, so the existing alias no longer
  // matches it. The alias still names the same release, so promotion proceeds.
  const f = fixture();
  const candidate = await latestCandidate(f.client);
  f.state.canonical.set('2.1.0-r400565502', f.newDigest);
  f.state.imageLabels.set(f.newDigest, labels(f.state.retained.get('400565502')));

  const result = await promoteLatest(f.client, candidate, f.inspect);
  assert.equal(result.outcome, 'published');
  assert.equal(f.state.puts.length, 1);
  assert.equal(f.state.alias, f.newDigest);
});

test('current latest must have valid origin and map to a retained stable release with the same canonical digest', async () => {
  for (const mutation of [
    f => { f.state.imageLabels.get(f.oldDigest)['org.opencontainers.image.source'] = 'https://github.com/other/openchamber'; },
    f => { f.state.imageLabels.get(f.oldDigest)['org.opencontainers.image.version'] = '2.0.3'; },
    f => { f.state.imageLabels.get(f.oldDigest)['org.opencontainers.image.revision'] = 'f'.repeat(40); },
    f => { f.state.retained.delete('398707683'); },
    f => { f.state.retained.set('398707683', release('2.0.4', 398707683, { prerelease: true })); },
    f => { f.state.canonical.set('2.0.4-r398707683', f.newDigest); },
  ]) {
    const f = fixture();
    mutation(f);
    await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect));
    assert.equal(f.state.puts.length, 0);
  }
});

test('selection, selected asset, canonical digest, and alias drift immediately before PUT each prevent writes', async () => {
  for (const change of ['selection', 'asset', 'canonical', 'alias', 'previous-canonical']) {
    let listCalls = 0;
    const f = fixture(undefined, { onRequest(url, init, state) {
      if (url.pathname === '/repos/openchamber/openchamber/releases' && ++listCalls === 2) {
        if (change === 'selection') state.pages = [[release('2.2.0', 500000001), older, newest]];
        if (change === 'asset') {
          const changed = structuredClone(newest);
          changed.assets[0].digest = `sha256:${'d'.repeat(64)}`;
          state.retained.set(String(newest.id), changed);
        }
        if (change === 'canonical') state.canonical.set('2.1.0-r400565502', `sha256:${'d'.repeat(64)}`);
        if (change === 'alias') state.alias = f.newDigest;
        if (change === 'previous-canonical') state.canonical.set('2.0.4-r398707683', f.newDigest);
      }
      assert.notEqual(init.method, 'PUT', 'Drift must be detected before the first write');
    } });
    await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect), /changed/);
    assert.equal(f.state.puts.length, 0);
  }
});

test('staged action outputs are validated at consumption before network or image inspection', async () => {
  const f = fixture();
  const valid = await latestCandidate(f.client);
  for (const overrides of [
    { outcome: 'waiting' }, { version: '2.1.0\nEVIL=yes' }, { version: '2.1.0-beta.1' },
    { release_id: '400565502;evil' }, { digest: `${f.newDigest}\nEVIL=yes` },
    { asset_sha256: 'bad' }, { published_at: '2026-09-31T00:00:00Z' },
    { alias_status: 'absent', previous_digest: f.oldDigest }, { alias_status: 'present', previous_digest: '' },
  ]) {
    const requests = f.requests.length;
    const inspections = f.inspections.length;
    await assert.rejects(promoteLatest(f.client, { ...valid, ...overrides }, f.inspect));
    assert.equal(f.requests.length, requests);
    assert.equal(f.inspections.length, inspections);
    assert.equal(f.state.puts.length, 0);
  }
  await assert.rejects(f.client.registryToken('push'), /Unsupported/);
});

test('manifest GET checks supported media, header digest, byte hash, JSON shape and the 4 MiB bound before PUT', async () => {
  for (const options of [
    { getStatus: 500 }, { getStatus: 302 }, { getContentType: 'text/html' },
    { getHeaderDigest: `sha256:${'d'.repeat(64)}` }, { getBytes: Buffer.from('different bytes') },
    { getBytes: Buffer.alloc(4 * 1024 * 1024 + 1) },
    ...['fixture-github-secret {', '{"schemaVersion":1}',
      `{"schemaVersion":2,"mediaType":"${manifestType}","manifests":[]}`,
      `{"schemaVersion":2,"mediaType":"${indexType}"}`].map(bytes => ({
      documents: { [newest.id]: document(newest, indexType, Buffer.from(bytes)) },
    })),
  ]) {
    const f = fixture(undefined, options);
    await assert.rejects(promoteLatest(f.client, await latestCandidate(f.client), f.inspect), error => {
      assert(!error.message.includes('fixture-github-secret'));
      return true;
    });
    assert.equal(f.state.puts.length, 0);
  }
});

test('transport/redirect diagnostics do not leak credentials and every authenticated request refuses redirects', async () => {
  const f = fixture(undefined, { onRequest(url) {
    if (url.pathname.endsWith('/manifests/latest')) throw new Error('fixture-github-secret redirect https://evil.invalid/fixture-registry-pull-secret');
  } });
  await assert.rejects(latestCandidate(f.client), error => {
    assert.match(error.message, /transport failure/);
    assert(!error.message.includes('fixture-'));
    assert(!error.message.includes('evil.invalid'));
    return true;
  });
  assert(f.requests.every(({ url, init }) => init.redirect === 'error' && !url.includes('secret')));
  assert.equal(f.state.puts.length, 0);
});

test('image label JSON is bounded before parsing and malformed JSON diagnostics are redacted', async () => {
  const directory = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'openchamber-latest-test-'));
  const path = join(directory, 'labels.json');
  try {
    await writeFile(path, JSON.stringify(labels(newest)));
    assert.deepEqual(await readLabelsFile(path), labels(newest));
    await writeFile(path, Buffer.alloc(64 * 1024 + 1));
    await assert.rejects(readLabelsFile(path), /size limit/);
    await writeFile(path, 'fixture-github-secret {');
    await assert.rejects(readLabelsFile(path), error => error.message === 'Invalid bounded JSON response');
    await assert.rejects(readLabelsFile(directory), /regular file/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('the actual latest workflow gate admits zero-build/skipped-image runs and excludes failures, cancellation, recovery and bootstrap', async () => {
  const workflow = await readFile(new URL('./.github/workflows/build.yml', import.meta.url), 'utf8');
  const job = workflow.match(/(?:^|\n)  latest:\n([\s\S]*?)(?=\n  \w+:|$)/)?.[1];
  assert(job);
  assert.match(job, /needs: \[discover, image\]/);
  assert.match(job, /group: openchamber-latest\n      cancel-in-progress: false/);
  assert.match(job, /contents: read\n      packages: write/);
  const condition = job.match(/if: >-\n([\s\S]*?)\n    runs-on:/)?.[1].trim();
  assert(condition?.startsWith('${{') && condition.endsWith('}}'));
  assert(condition.includes('!cancelled()'), 'A status check must suppress implicit success() when image is skipped');
  // This caller uses only the shared JS/Actions Boolean operator subset; expected
  // results below are independent acceptance cases for the actual workflow gate.
  const gate = new Function('github', 'inputs', 'needs', 'cancelled', `return (${condition.slice(3, -2)});`);
  const base = { event: 'workflow_dispatch', ref: 'refs/heads/main', discover: 'success', image: 'success', count: '1', inputs: {} };
  for (const [overrides, expected] of [
    [{}, true], [{ event: 'schedule' }, true], [{ image: 'skipped', count: '0' }, true],
    [{ event: 'schedule', image: 'skipped', count: '0' }, true],
    [{ image: 'skipped' }, false], [{ image: 'failure' }, false], [{ image: 'cancelled' }, false],
    [{ discover: 'failure' }, false], [{ cancelled: true }, false], [{ event: 'push' }, true],
    [{ ref: 'refs/heads/other' }, false], [{ inputs: { bootstrap: true } }, false],
    [{ inputs: { verify_digest: `sha256:${'d'.repeat(64)}` } }, false],
    [{ inputs: { release_id: '398707683' } }, true],
  ]) {
    const item = { ...base, ...overrides };
    assert.equal(gate({ event_name: item.event, ref: item.ref }, item.inputs,
      { discover: { result: item.discover, outputs: { count: item.count } }, image: { result: item.image } },
      () => item.cancelled === true), expected, JSON.stringify(overrides));
  }
});

test('CLI consumption failure exits nonzero and records a redacted machine result and Actions summary without remote/image calls', async () => {
  const directory = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'openchamber-latest-cli-test-'));
  const output = join(directory, 'output');
  const summary = join(directory, 'summary');
  try {
    await assert.rejects(promisify(execFile)(process.execPath, [fileURLToPath(new URL('./latest.mjs', import.meta.url)), 'promote'], {
      timeout: 5000, maxBuffer: 64 * 1024, env: {
        ...process.env, GITHUB_REPOSITORY: 'miloszkolber/openchamber',
        GITHUB_TOKEN: 'fixture-github-secret', GITHUB_ACTOR: 'fixture-actor',
        GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary,
        LATEST_OUTCOME: 'ready', LATEST_VERSION: '2.1.0\nEVIL=yes',
      },
    }), error => {
      assert.equal(error.code, 1);
      const values = JSON.parse(error.stdout);
      assert.equal(values.outcome, 'failed');
      assert.equal(values.publisher, '');
      assert.equal(values.selected_release, '');
      assert.equal(values.alias_status, 'unknown', 'A failed consume boundary does not prove alias absence');
      assert.match(error.stderr, /Unsupported release version/);
      assert(!`${error.stdout}${error.stderr}`.includes('fixture-github-secret'));
      assert(!`${error.stdout}${error.stderr}`.includes('EVIL'));
      return true;
    });
    assert.match(await readFile(output, 'utf8'), /outcome=failed/);
    assert.match(await readFile(summary, 'utf8'), /Outcome: `failed`/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('the actual workflow reports failed or timed-out login before promotion, preserves observations, and cleans its owned auth directory', async () => {
  const workflow = await readFile(new URL('./.github/workflows/build.yml', import.meta.url), 'utf8');
  const step = workflow.match(/      - name: Verify retained provenance and promote the exact registry bytes\n([\s\S]*?)(?=\n  verification:)/)?.[1];
  const block = step?.match(/        run: \|\n([\s\S]*)/)?.[1];
  assert(block, 'Use the actual caller, not a copied shell recipe');
  const script = block.split('\n').filter(line => line.startsWith('          ')).map(line => line.slice(10)).join('\n');
  const candidate = await latestCandidate(fixture().client);
  const directory = await mkdtemp(join(process.env.RUNNER_TEMP || tmpdir(), 'openchamber-login-test-'));
  try {
    await writeFile(join(directory, 'timeout'), '#!/bin/sh\ncat >/dev/null\nexit "$LOGIN_EXIT"\n', { mode: 0o700 });
    await writeFile(join(directory, 'node'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$NODE_CALLS"\nexec "$RUNTIME_EXECUTABLE" "$@"\n', { mode: 0o700 });
    for (const code of [42, 124]) {
      const output = join(directory, `output-${code}`);
      const summary = join(directory, `summary-${code}`);
      const calls = join(directory, `calls-${code}`);
      await assert.rejects(promisify(execFile)('bash', ['-e', '-o', 'pipefail', '-c', script], {
        cwd: fileURLToPath(new URL('.', import.meta.url)), timeout: 5000, maxBuffer: 64 * 1024,
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, RUNNER_TEMP: directory,
          RUNTIME_EXECUTABLE: process.execPath, LOGIN_EXIT: String(code), NODE_CALLS: calls,
          GITHUB_REPOSITORY: 'miloszkolber/openchamber', GITHUB_TOKEN: 'fixture-login-secret', GITHUB_ACTOR: 'fixture-actor',
          GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary,
          LATEST_OUTCOME: candidate.outcome, LATEST_VERSION: candidate.version, LATEST_RELEASE_ID: candidate.release_id,
          LATEST_ASSET_SHA256: candidate.asset_sha256, LATEST_PUBLISHED_AT: candidate.published_at,
          LATEST_DIGEST: candidate.digest, LATEST_PREVIOUS_DIGEST: candidate.previous_digest,
          LATEST_ALIAS_STATUS: candidate.alias_status,
        },
      }), error => {
        assert.equal(error.code, code, 'Keep the original setup failure status');
        const result = JSON.parse(error.stdout);
        assert.equal(result.outcome, 'failed');
        assert.equal(result.phase, 'setup');
        assert.equal(result.put_attempted, false);
        assert.equal(result.selected_release, '2.1.0-r400565502');
        assert.equal(result.digest, candidate.digest);
        assert.equal(result.previous_digest, candidate.previous_digest);
        assert(!`${error.stdout}${error.stderr}`.includes('fixture-login-secret'));
        return true;
      });
      assert.equal(await readFile(calls, 'utf8'), 'latest.mjs setup-failed\n', 'Promotion and PUT must never start');
      assert.match(await readFile(output, 'utf8'), /outcome=failed/);
      assert.match(await readFile(output, 'utf8'), /put_attempted=false/);
      assert.match(await readFile(summary, 'utf8'), /manifest PUT was not attempted/);
    }
    const { readdir } = await import('node:fs/promises');
    assert(!(await readdir(directory)).some(name => name.startsWith('openchamber-latest-auth.')));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
