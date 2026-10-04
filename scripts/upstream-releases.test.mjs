import test from 'node:test';
import assert from 'node:assert/strict';
import { ReleaseClient, RegistryAuthError, candidate, discover, prepare, verifyImage, verifyOrigin, verifyRelease } from './upstream-releases.mjs';

// GitHub REST release/asset and OCI registry fixtures. Expected tags below come
// from the publication/identity contract, never from the implementation's output.
const digest = 'a'.repeat(64);
const metadata = { name: 'openchamber', package_type: 'container', visibility: 'private',
  repository: { full_name: 'miloszkolber/openchamber', private: true } };
function release(version, id, overrides = {}) {
  return { id, tag_name: `v${version}`, draft: false, prerelease: version.includes('-'),
    published_at: '2026-09-25T12:00:00Z', assets: [{
      id: id + 100, name: `openchamber-web-${version}.tgz`, state: 'uploaded', size: 1000,
      browser_download_url: `https://github.com/openchamber/openchamber/releases/download/v${version}/openchamber-web-${version}.tgz`,
      digest: `sha256:${digest}`,
    }], ...overrides };
}
function response(body, status = 200, headers = {}) {
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}
function fixture(pages, options = {}) {
  const requests = [];
  const client = new ReleaseClient({ token: 'fixture-github', actor: 'fixture-actor', fetchImpl: async (address, init) => {
    const url = new URL(address);
    requests.push({ url: url.href, init });
    assert.equal(init.redirect, 'error');
    assert(init.signal instanceof AbortSignal);
    if (url.origin === 'https://api.github.com') {
      assert.equal(init.headers.Authorization, 'Bearer fixture-github');
      if (url.pathname === '/repos/miloszkolber/openchamber') {
        return response(options.repository ?? { full_name: 'miloszkolber/openchamber', private: true },
          options.repositoryStatus ?? 200);
      }
      if (url.pathname === '/users/miloszkolber/packages/container/openchamber') {
        return response(options.metadata ?? metadata, options.metadataStatus ?? 200);
      }
      if (url.pathname === '/repos/openchamber/openchamber/releases') {
        assert.equal(url.searchParams.get('per_page'), '100');
        const page = Number(url.searchParams.get('page'));
        assert(pages[page - 1], `Unexpected page ${page}`);
        if (options.invalidReleaseJson) return new Response('fixture-private-payload {');
        return response(pages[page - 1], 200, page < pages.length ? {
          // Observed official GitHub Link route for this upstream repository.
          link: options.link ?? `<https://api.github.com/repositories/1054790989/releases?per_page=100&page=${page + 1}>; rel="next", <https://api.github.com/repositories/1054790989/releases?per_page=100&page=${pages.length}>; rel="last"`,
        } : {});
      }
      const id = url.pathname.match(/^\/repos\/openchamber\/openchamber\/releases\/(\d+)$/)?.[1];
      if (id) return response(options.lookup ?? pages.flat().find(item => String(item.id) === id), options.lookupStatus ?? 200);
    }
    if (url.origin === 'https://ghcr.io' && url.pathname === '/token') {
      assert.equal(url.searchParams.get('scope'), 'repository:miloszkolber/openchamber:pull');
      assert.equal(init.headers.Authorization, `Basic ${Buffer.from('fixture-actor:fixture-github').toString('base64')}`);
      if (options.tokenError) throw new Error('fixture transport failure');
      return response({ token: 'fixture-registry' }, options.tokenStatus ?? 200);
    }
    if (url.origin === 'https://ghcr.io' && url.pathname.startsWith('/v2/miloszkolber/openchamber/manifests/')) {
      assert.equal(init.method, 'HEAD');
      assert.equal(init.headers.Authorization, 'Bearer fixture-registry');
      if (options.manifestError) throw new Error('fixture manifest transport failure');
      const tag = url.pathname.split('/').at(-1);
      const status = options.manifestStatuses?.[tag] ?? options.manifestStatus ?? 404;
      return response(null, status, status === 200 ? {
        'docker-content-digest': `sha256:${'b'.repeat(64)}`, 'content-type': 'application/vnd.oci.image.manifest.v1+json',
        ...options.manifestHeaders,
      } : {});
    }
    throw new Error(`Unexpected fixture URL ${url.href}`);
  } });
  return { client, requests };
}

test('all API pages catch multiple releases, including the inclusive boundary after an older record', async () => {
  const { client, requests } = fixture([
    [release('2.1.0', 400565502), release('2.0.4', 398707683)],
    [release('1.0.0', 100, { published_at: '2026-09-24T19:14:24Z' }), release('2.0.3', 397868365)],
    [release('2.0.2', 397002711), release('2.0.1', 395994070, { published_at: '2026-09-24T19:14:25Z' })],
  ]);
  const result = await discover(client);
  assert.deepEqual(result.include.map(item => [item.version, item.release_id, item.asset_sha256, item.bootstrap]), [
    ['2.0.1', '395994070', digest, false], ['2.0.2', '397002711', digest, false],
    ['2.0.3', '397868365', digest, false], ['2.0.4', '398707683', digest, false], ['2.1.0', '400565502', digest, false],
  ]);
  assert.equal(requests.filter(item => new URL(item.url).pathname === '/repos/openchamber/openchamber/releases').length, 3);
});

test('drafts skip, prereleases build, and absent/uploading assets stay pending for a later poll', async () => {
  const draft = release('draft', 400000001, { draft: true, published_at: null, tag_name: null, assets: null });
  const late = release('2.2.0', 400000002, { assets: [] });
  const uploading = release('2.3.0', 400000003);
  uploading.assets[0].state = 'starter';
  uploading.assets[0].size = 0;
  const beta = release('2.4.0-beta.1', 400000004);
  const initial = await discover(fixture([[draft, late, uploading, beta]]).client);
  assert.equal(initial.pending, 2);
  assert.deepEqual(initial.include.map(item => item.version), ['2.4.0-beta.1']);
  const later = await discover(fixture([[release('2.2.0', 400000002), release('2.3.0', 400000003), beta]]).client);
  assert.deepEqual(later.include.map(item => item.version), ['2.2.0', '2.3.0', '2.4.0-beta.1']);
});

test('a completed canonical tag skips, while reuse of the version with a new release ID remains distinct', async () => {
  const result = await discover(fixture([[release('2.0.1', 395994070), release('2.0.1', 410000001)]], {
    manifestStatuses: { '2.0.1-r395994070': 200 },
  }).client);
  assert.equal(result.completed, 1);
  assert.deepEqual(result.include.map(item => [item.version, item.release_id]), [['2.0.1', '410000001']]);
});

test('only an authenticated manifest 404 means absent; auth, HTTP, and transport failures fail closed', async () => {
  const pages = [[release('2.0.1', 395994070)]];
  assert.equal((await discover(fixture(pages).client)).include.length, 1);
  for (const tokenStatus of [401, 403]) {
    await assert.rejects(discover(fixture(pages, { tokenStatus }).client), RegistryAuthError);
  }
  for (const manifestStatus of [401, 403, 429, 500]) {
    await assert.rejects(discover(fixture(pages, { manifestStatus }).client), /not an absent image/);
  }
  for (const tokenStatus of [404, 500]) {
    await assert.rejects(discover(fixture(pages, { tokenStatus }).client), /token request failed/);
  }
  await assert.rejects(discover(fixture(pages, { tokenError: true }).client), /transport failure/);
  await assert.rejects(discover(fixture(pages, { manifestError: true }).client), /transport failure/);
});

test('explicit bootstrap authorizes just the seed, does not classify 403 as absence, then ordinary polling catches up', async () => {
  const pages = [[release('2.0.1', 395994070), release('2.0.2', 397002711)]];
  const options = { metadataStatus: 404, tokenStatus: 403 };
  await assert.rejects(discover(fixture(pages, options).client), RegistryAuthError);
  const { client, requests } = fixture(pages, options);
  const seed = await discover(client, { bootstrap: true });
  assert.deepEqual(seed.include.map(item => [item.version, item.release_id, item.bootstrap]), [['2.0.1', '395994070', true]]);
  assert.equal(requests.filter(item => item.init.method === 'HEAD').length, 0, 'No claimed manifest result without authentication');
  await assert.rejects(discover(fixture(pages, options).client, { bootstrap: true, releaseId: '397002711' }), /only select/);
  await assert.rejects(discover(fixture(pages, { tokenStatus: 403 }).client, { bootstrap: true }), RegistryAuthError);
  await assert.rejects(discover(fixture(pages, { metadataStatus: 403, tokenStatus: 403 }).client, { bootstrap: true }), /metadata unavailable/);
  await assert.rejects(discover(fixture(pages, { metadataStatus: 404, tokenError: true }).client, { bootstrap: true }), /transport failure/);
  const catchup = await discover(fixture(pages, { manifestStatuses: { '2.0.1-r395994070': 200 } }).client);
  assert.deepEqual(catchup.include.map(item => item.version), ['2.0.2']);
});

test('versions, digests, timestamps, assets, and pagination are validated at the API boundary', async () => {
  for (const version of ['2.0.1;echo pwn', '2.0.1\nINJECT=1', '02.0.1', '2.0.1+metadata', '2.0.1-beta.01']) {
    assert.throws(() => candidate(release(version, 395994070)), /version|prerelease/);
  }
  for (const invalid of ['', 'sha256:abc', `md5:${digest}`, `sha256:${digest}\nEVIL=yes`, `sha256:${'A'.repeat(64)}`]) {
    const item = release('2.0.1', 395994070);
    item.assets[0].digest = invalid;
    assert.throws(() => candidate(item), /digest/);
  }
  const noDigest = release('2.0.1', 395994070);
  noDigest.assets[0].digest = null;
  assert.equal(candidate(noDigest).asset_sha256, '', 'GitHub assets without a digest are not falsely claimed verified');
  const badUrl = release('2.0.1', 395994070);
  badUrl.assets[0].browser_download_url = 'https://evil.invalid/web.tgz';
  assert.throws(() => candidate(badUrl), /download URL/);
  const duplicate = release('2.0.1', 395994070);
  duplicate.assets.push({ ...duplicate.assets[0] });
  assert.throws(() => candidate(duplicate), /Duplicate/);
  assert.throws(() => candidate(release('2.0.1', 395994070, { published_at: '2026-09-31T00:00:00Z' })), /timestamp/);
  for (const link of [
    '<https://evil.invalid/releases?per_page=100&page=2>; rel="next"',
    '<https://api.github.com/repositories/1/releases?per_page=100&page=2>; rel="next"',
    '<https://api.github.com/repos/openchamber/openchamber/releases?per_page=100&page=1>; rel="next"',
  ]) {
    await assert.rejects(discover(fixture([[noDigest], []], { link }).client), /pagination link/);
  }
  await assert.rejects(discover(fixture([[noDigest]], { manifestStatus: 200, manifestHeaders: { 'docker-content-digest': 'bad' } }).client), /manifest digest/);
  await assert.rejects(discover(fixture([[noDigest]], { invalidReleaseJson: true }).client), error => {
    assert.equal(error.message, 'Invalid API JSON response');
    return true;
  });
});

test('package and build repository privacy are independent checks; missing linkage is not a contradictory link', async () => {
  const pages = [[release('2.0.1', 395994070)]];
  for (const bad of [
    { ...metadata, visibility: 'public' },
    { ...metadata, repository: { full_name: 'openchamber/openchamber', private: true } },
    { ...metadata, repository: { full_name: 'miloszkolber/openchamber', private: false } },
    { ...metadata, repository: {} },
  ]) {
    await assert.rejects(discover(fixture(pages, { metadata: bad }).client), /private|different or public/);
  }
  // Exact shape observed from GHCR with the workflow token on 2026-10-04:
  // package privacy is present; repository is absent, not a public/wrong link.
  const { repository: _unused, ...withoutLinkage } = metadata;
  for (const compatible of [withoutLinkage, { ...metadata, repository: null }]) {
    assert.equal((await discover(fixture(pages, { metadata: compatible }).client)).include.length, 1);
  }
  for (const repository of [
    { full_name: 'miloszkolber/openchamber', private: false },
    { full_name: 'other/openchamber', private: true },
  ]) await assert.rejects(discover(fixture(pages, { repository }).client), /repository must be private/);
  await assert.rejects(discover(fixture(pages, { repositoryStatus: 403 }).client), /repository metadata unavailable/);
  await assert.rejects(discover(fixture(pages, { metadataStatus: 404, repository: {
    full_name: 'miloszkolber/openchamber', private: false,
  } }).client, { bootstrap: true }), /repository must be private/);
  await assert.rejects(discover(fixture(pages, { metadataStatus: 404, manifestStatus: 200 }).client), /no verified private/);
  await assert.rejects(fixture(pages, { metadataStatus: 404 }).client.privatePackage(), /metadata unavailable/);
});

test('published image provenance must identify the private build source, checked commit, version, and release', () => {
  const input = { version: '2.0.1', releaseId: '395994070', sourceCommit: 'e'.repeat(40) };
  const labels = {
    'org.opencontainers.image.source': 'https://github.com/miloszkolber/openchamber',
    'org.opencontainers.image.revision': 'e'.repeat(40),
    'org.opencontainers.image.version': '2.0.1',
    'io.openchamber.upstream.release-id': '395994070',
  };
  assert.deepEqual(verifyOrigin(labels, input), {
    source: 'https://github.com/miloszkolber/openchamber', revision: 'e'.repeat(40), version: '2.0.1', release_id: '395994070',
  });
  for (const [key, wrong] of [
    ['org.opencontainers.image.source', 'https://github.com/openchamber/openchamber'],
    ['org.opencontainers.image.revision', 'f'.repeat(40)],
    ['org.opencontainers.image.version', '2.0.2'],
    ['io.openchamber.upstream.release-id', '410000001'],
  ]) assert.throws(() => verifyOrigin({ ...labels, [key]: wrong }, input), /Published image/);
  assert.throws(() => verifyOrigin(labels, { ...input, sourceCommit: 'e'.repeat(40) + '\n' }), /Expected build source commit/);
});

test('publication verification requires the exact remote tag and push manifest digest, not only private metadata', async () => {
  const input = { image: 'ghcr.io/miloszkolber/openchamber:2.0.1-r395994070', digest: `sha256:${'b'.repeat(64)}` };
  const good = fixture([[]], { manifestStatus: 200 });
  assert.deepEqual(await verifyImage(good.client, input), input);
  assert(good.requests.some(item => item.init.method === 'HEAD' &&
    item.url === 'https://ghcr.io/v2/miloszkolber/openchamber/manifests/2.0.1-r395994070'));
  await assert.rejects(verifyImage(fixture([[]]).client, input), /tag is absent/);
  await assert.rejects(verifyImage(fixture([[]], { manifestStatus: 200,
    manifestHeaders: { 'docker-content-digest': `sha256:${'c'.repeat(64)}` } }).client, input), /does not match/);
  await assert.rejects(verifyImage(fixture([[]], { tokenStatus: 403 }).client, input), RegistryAuthError);
  await assert.rejects(verifyImage(fixture([[]], { metadata: { ...metadata, visibility: 'public' } }).client, input), /private/);
  for (const bad of [
    { ...input, image: 'ghcr.io/other/openchamber:2.0.1-r395994070' },
    { ...input, image: 'ghcr.io/miloszkolber/openchamber:latest' },
    { ...input, digest: `sha256:${'b'.repeat(64)}\nINJECT=1` },
  ]) await assert.rejects(verifyImage(fixture([[]]).client, bad), /Expected/);
});

test('read-only verification recovery uses the original publishing commit and does not suppress existing tags', async () => {
  const input = { releaseId: '395994070', digest: `sha256:${'b'.repeat(64)}`, sourceCommit: 'e'.repeat(40) };
  const good = fixture([[release('2.0.1', 395994070)]], { manifestStatus: 200 });
  assert.deepEqual(await verifyRelease(good.client, input), {
    image: 'ghcr.io/miloszkolber/openchamber:2.0.1-r395994070', digest: `sha256:${'b'.repeat(64)}`,
    version: '2.0.1', release_id: '395994070', source_commit: 'e'.repeat(40),
  });
  assert(good.requests.some(item => item.init.method === 'HEAD'));
  await assert.rejects(verifyRelease(fixture([[release('2.0.1', 395994070)]]).client, input), /tag is absent/);
  const invalid = fixture([[release('2.0.1', 395994070)]]);
  await assert.rejects(verifyRelease(invalid.client, { ...input, sourceCommit: '' }), /original publishing commit/);
  assert.equal(invalid.requests.length, 0);
});

test('matrix limit fails explicitly at 257 absent releases; never silently drops backlog', async () => {
  const releases = Array.from({ length: 257 }, (_, index) => release(`3.0.${index}`, 500000000 + index));
  await assert.rejects(discover(fixture([releases.slice(0, 100), releases.slice(100, 200), releases.slice(200)]).client), /More than 256/);
});

test('manual selection rejects missing IDs, and a duplicate API page record cannot produce two jobs', async () => {
  const seed = release('2.0.1', 395994070);
  const pages = [[seed], [seed, release('2.0.2', 397002711)]];
  assert.equal((await discover(fixture(pages).client)).include.length, 2);
  const selected = await discover(fixture(pages).client, { releaseId: '397002711' });
  assert.deepEqual(selected.include.map(item => item.version), ['2.0.2']);
  await assert.rejects(discover(fixture(pages).client, { releaseId: '999999' }), /not found/);
  await assert.rejects(discover(fixture(pages).client, { releaseId: '395994070\nOTHER=1' }), /Invalid release ID/);
});

test('prepare revalidates release identity/digest and reconciles completion after another run publishes', async () => {
  const seed = release('2.0.1', 395994070);
  const inputs = { version: '2.0.1', releaseId: '395994070', assetSha256: digest };
  assert.deepEqual(await prepare(fixture([[seed]]).client, inputs), {
    version: '2.0.1', release_id: '395994070', asset_sha256: digest,
    image: 'ghcr.io/miloszkolber/openchamber:2.0.1-r395994070', skip: 'false',
  });
  assert.equal((await prepare(fixture([[seed]], { manifestStatus: 200 }).client, inputs)).skip, 'true');
  const replaced = release('2.0.1', 395994070);
  replaced.assets[0].digest = `sha256:${'c'.repeat(64)}`;
  await assert.rejects(prepare(fixture([[seed]], { lookup: replaced }).client, inputs), /changed after discovery/);
  await assert.rejects(prepare(fixture([[seed]], { lookup: release('2.0.1', 410000001) }).client, inputs), /identity mismatch/);
  assert.equal((await prepare(fixture([[seed]], { metadataStatus: 404, tokenStatus: 403 }).client,
    { ...inputs, bootstrap: true })).skip, 'false');
  await assert.rejects(prepare(fixture([[seed]], { tokenStatus: 403 }).client, { ...inputs, bootstrap: true }), /Bootstrap bypass/);
});
