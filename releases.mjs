#!/usr/bin/env node
// Dependency-free GitHub/GHCR boundary. No high-water mark or repository writes.
import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPSTREAM = 'openchamber/openchamber';
// GitHub's release-list Link header uses this canonical repository-ID route.
const UPSTREAM_ID = '1054790989';
export const REPOSITORY = 'miloszkolber/openchamber';
export const IMAGE = `ghcr.io/${REPOSITORY}`;
export const CUTOFF = '2026-09-24T19:14:25Z';
// Mirrors the build repository's visibility; GitHub copies it to the package.
export const EXPECTED_PACKAGE_VISIBILITY = 'public';
export const SEED_ID = '395994070';
const API = 'https://api.github.com';
export const MANIFEST_TYPES = [
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
];

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateVersion(version) {
  requireValue(typeof version === 'string' && version.length <= 100 &&
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.test(version),
  'Unsupported release version: expected tag vSEMVER without build metadata');
  const prerelease = version.split('-').slice(1).join('-');
  requireValue(!prerelease.split('.').some(part => /^\d+$/.test(part) && part.length > 1 && part[0] === '0'),
    'Invalid numeric prerelease identifier');
  return version;
}

export function validateId(value) {
  requireValue(typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)),
    'Invalid release ID');
  return value;
}

function apiId(value) {
  requireValue(typeof value === 'number' && Number.isSafeInteger(value) && value > 0, 'Invalid API ID');
  return String(value);
}

export function validateDigest(digest) {
  if (digest === null || digest === undefined) return '';
  requireValue(typeof digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(digest), 'Invalid asset SHA-256 digest');
  return digest.slice(7);
}

export function candidate(release) {
  requireValue(release && typeof release === 'object' && !Array.isArray(release), 'Invalid release record');
  const release_id = apiId(release.id);
  requireValue(typeof release.draft === 'boolean', 'Invalid release draft flag');
  if (release.draft) return null;
  requireValue(typeof release.published_at === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(release.published_at) &&
    Number.isFinite(Date.parse(release.published_at)) &&
    new Date(release.published_at).toISOString().replace('.000Z', 'Z') === release.published_at,
  'Invalid release publication timestamp');
  if (release.published_at < CUTOFF) return null;
  requireValue(typeof release.prerelease === 'boolean', 'Invalid release prerelease flag');
  requireValue(typeof release.tag_name === 'string' && release.tag_name.startsWith('v'), 'Expected v-prefixed release tag');
  const version = validateVersion(release.tag_name.slice(1));
  requireValue(Array.isArray(release.assets), 'Invalid release asset list');
  const name = `openchamber-web-${version}.tgz`;
  const assets = release.assets.filter(asset => asset?.name === name);
  requireValue(assets.length <= 1, 'Duplicate matching web assets');
  if (assets.length === 0) return { pending: true, release_id };
  const asset = assets[0];
  apiId(asset.id);
  requireValue(['uploaded', 'new', 'starter'].includes(asset.state), 'Invalid web asset upload state');
  requireValue(Number.isSafeInteger(asset.size) && asset.size >= 0, 'Invalid web asset size');
  if (asset.state !== 'uploaded' || asset.size === 0) return { pending: true, release_id };
  requireValue(asset.browser_download_url ===
    `https://github.com/${UPSTREAM}/releases/download/v${version}/${name}`, 'Unexpected web asset download URL');
  const asset_sha256 = validateDigest(asset.digest);
  requireValue(`${version}-r${release_id}`.length <= 128, 'Image tag exceeds registry limit');
  return { version, release_id, asset_sha256 };
}

export async function responseBytes(response, maxBytes) {
  requireValue(response.body, 'Missing API response body');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      let part;
      try { part = await reader.read(); } catch { throw new Error('API response transport failure'); }
      const { value, done } = part;
      if (done) break;
      length += value.byteLength;
      requireValue(length <= maxBytes, 'API response exceeded size limit');
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    await reader.cancel().catch(() => {});
  }
}

async function json(response, maxBytes = 8 * 1024 * 1024) {
  const bytes = await responseBytes(response, maxBytes);
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    // JSON parser messages can quote response data, including bearer tokens.
    throw new Error('Invalid API JSON response');
  }
}

export class RegistryAuthError extends Error {}

export class ReleaseClient {
  constructor({ token, actor, fetchImpl = fetch }) {
    requireValue(typeof token === 'string' && token.length > 0 && !/[\r\n]/.test(token), 'GITHUB_TOKEN is required');
    requireValue(typeof actor === 'string' && actor.length > 0 && actor.length <= 100 && !/[:\r\n]/.test(actor),
      'GITHUB_ACTOR is required');
    this.token = token;
    this.actor = actor;
    this.fetch = fetchImpl;
  }

  async request(url, options = {}) {
    try {
      return await this.fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(20_000) });
    } catch {
      // Transport errors can include URLs, headers, or private response data.
      throw new Error('Remote transport failure; no response was verified');
    }
  }

  async github(path) {
    return this.request(`${API}${path}`, { headers: {
      Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'openchamber-private-build',
    } });
  }

  async *releases() {
    const path = `/repos/${UPSTREAM}/releases`;
    let page = 1;
    const seen = new Set();
    while (true) {
      requireValue(page <= 1000, 'Release pagination exceeded 1000 pages; refusing partial discovery');
      const response = await this.github(`${path}?per_page=100&page=${page}`);
      requireValue(response.ok, `Release listing failed (HTTP ${response.status})`);
      const releases = await json(response);
      requireValue(Array.isArray(releases) && releases.length <= 100, 'Invalid release page');
      for (const release of releases) {
        const id = apiId(release?.id);
        if (!seen.has(id)) {
          seen.add(id);
          yield release;
        }
      }
      const next = [...(response.headers.get('link') || '').matchAll(/<([^>]+)>;\s*rel="next"/g)];
      requireValue(next.length <= 1, 'Ambiguous release pagination');
      if (next.length === 0) return;
      const url = new URL(next[0][1]);
      requireValue(url.origin === API && [path, `/repositories/${UPSTREAM_ID}/releases`].includes(url.pathname) &&
        !url.username && !url.password && !url.hash &&
        url.searchParams.get('per_page') === '100' && url.searchParams.get('page') === String(page + 1) &&
        [...url.searchParams.keys()].length === 2, 'Unsafe or repeated release pagination link');
      page += 1;
    }
  }

  async release(id) {
    const response = await this.github(`/repos/${UPSTREAM}/releases/${validateId(id)}`);
    requireValue(response.ok, `Release lookup failed (HTTP ${response.status})`);
    const release = await json(response);
    requireValue(apiId(release?.id) === id, 'Release lookup identity mismatch');
    return release;
  }

  async privatePackage({ allowMissing = false } = {}) {
    const repositoryResponse = await this.github(`/repos/${REPOSITORY}`);
    requireValue(repositoryResponse.ok, `Build repository metadata unavailable (HTTP ${repositoryResponse.status})`);
    const repository = await json(repositoryResponse, 1024 * 1024);
    requireValue(repository.full_name === REPOSITORY, 'Build repository identity changed');
    const response = await this.github('/users/miloszkolber/packages/container/openchamber');
    if (response.status === 404 && allowMissing) return false;
    requireValue(response.ok, `Package metadata unavailable (HTTP ${response.status}); check Actions package access`);
    const metadata = await json(response, 1024 * 1024);
    requireValue(metadata.package_type === 'container' && metadata.name === 'openchamber',
      'GHCR package must be the expected container package');
    // GitHub propagates the build repository's visibility to its linked package,
    // so this expectation moves with the repository rather than being fixed.
    requireValue(metadata.visibility === EXPECTED_PACKAGE_VISIBILITY,
      `GHCR package visibility is ${metadata.visibility}, expected ${EXPECTED_PACKAGE_VISIBILITY}`);
    // GHCR's observed REST payload omits repository entirely, even with the correct
    // OCI source label and working repository-token access. Missing linkage is not
    // evidence of a wrong link; reject contradictory metadata if it is supplied.
    if (metadata.repository !== undefined && metadata.repository !== null) {
      requireValue(metadata.repository.full_name === REPOSITORY,
      'GHCR metadata identifies a different repository');
    }
    return true;
  }

  async registryToken(scope = 'pull') {
    requireValue(['pull', 'pull,push'].includes(scope), 'Unsupported GHCR token scope');
    const url = new URL('https://ghcr.io/token');
    url.searchParams.set('service', 'ghcr.io');
    url.searchParams.set('scope', `repository:${REPOSITORY}:${scope}`);
    const response = await this.request(url.href, { headers: {
      Authorization: `Basic ${Buffer.from(`${this.actor}:${this.token}`).toString('base64')}`,
    } });
    if (response.status === 401 || response.status === 403) {
      throw new RegistryAuthError(`GHCR ${scope}-scope authentication failed (HTTP ${response.status}); not evidence of an absent image`);
    }
    requireValue(response.ok, `GHCR token request failed (HTTP ${response.status})`);
    const body = await json(response, 64 * 1024);
    const token = body.token ?? body.access_token;
    requireValue(typeof token === 'string' && token.length > 0 && token.length <= 16_384 && !/[\r\n]/.test(token),
      'Invalid GHCR bearer token');
    return token;
  }

  async manifestDigest(release, token) {
    validateVersion(release.version);
    validateId(release.release_id);
    const response = await this.request(`https://ghcr.io/v2/${REPOSITORY}/manifests/${release.version}-r${release.release_id}`, {
      method: 'HEAD', headers: { Authorization: `Bearer ${token}`, Accept: MANIFEST_TYPES.join(', ') },
    });
    if (response.status === 404) return null; // Only after successful pull-scope authentication.
    requireValue(response.ok, `GHCR manifest lookup failed (HTTP ${response.status}); not an absent image`);
    const digest = response.headers.get('docker-content-digest');
    requireValue(/^sha256:[a-f0-9]{64}$/.test(digest || ''), 'Invalid manifest digest');
    requireValue(MANIFEST_TYPES.includes((response.headers.get('content-type') || '').split(';')[0]), 'Unexpected manifest media type');
    return digest;
  }

  async completed(release, token) {
    return await this.manifestDigest(release, token) !== null;
  }
}

export async function verifyImage(client, { image, digest }) {
  requireValue(typeof image === 'string' && image.startsWith(`${IMAGE}:`), 'Expected canonical build-repository image');
  const tag = image.slice(IMAGE.length + 1);
  const match = tag.match(/^(.+)-r([1-9]\d*)$/);
  requireValue(match && tag.length <= 128, 'Expected canonical release image tag');
  const release = { version: validateVersion(match[1]), release_id: validateId(match[2]) };
  requireValue(typeof digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(digest), 'Expected pushed registry manifest digest');
  await client.privatePackage();
  const remoteDigest = await client.manifestDigest(release, await client.registryToken());
  requireValue(remoteDigest !== null, 'Published canonical image tag is absent');
  requireValue(remoteDigest === digest, 'Remote manifest digest does not match the checked image publication');
  return { image, digest: remoteDigest };
}

export async function verifyRelease(client, { releaseId, digest, sourceCommit }) {
  validateId(releaseId);
  requireValue(typeof digest === 'string' && /^sha256:[a-f0-9]{64}$/.test(digest), 'Expected pushed registry manifest digest');
  requireValue(typeof sourceCommit === 'string' && /^[a-f0-9]{40}$/.test(sourceCommit), 'Expected original publishing commit');
  const release = await client.release(releaseId);
  requireValue(release.draft === false && typeof release.tag_name === 'string' && release.tag_name.startsWith('v'),
    'Expected retained published upstream release');
  const version = validateVersion(release.tag_name.slice(1));
  const result = await verifyImage(client, { image: `${IMAGE}:${version}-r${releaseId}`, digest });
  return { ...result, version, release_id: releaseId, source_commit: sourceCommit };
}

export function verifyOrigin(labels, { version, releaseId, sourceCommit }) {
  validateVersion(version);
  validateId(releaseId);
  requireValue(typeof sourceCommit === 'string' && /^[a-f0-9]{40}$/.test(sourceCommit), 'Expected build source commit');
  requireValue(labels && typeof labels === 'object' && !Array.isArray(labels), 'Expected image labels');
  requireValue(labels['org.opencontainers.image.source'] === `https://github.com/${REPOSITORY}`,
    'Published image has the wrong build source');
  requireValue(labels['org.opencontainers.image.revision'] === sourceCommit, 'Published image has the wrong source commit');
  requireValue(labels['org.opencontainers.image.version'] === version, 'Published image has the wrong version');
  requireValue(labels['io.openchamber.upstream.release-id'] === releaseId, 'Published image has the wrong upstream release ID');
  return { source: `https://github.com/${REPOSITORY}`, revision: sourceCommit, version, release_id: releaseId };
}

export function stableCandidate(release) {
  const item = candidate(release);
  if (!item || item.pending || release.prerelease !== false || item.version.includes('-')) return null;
  return { ...item, published_at: release.published_at };
}

export function compareCandidate(a, b) {
  const left = a.version.split('.').map(BigInt);
  const right = b.version.split('.').map(BigInt);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  if (a.published_at !== b.published_at) return a.published_at > b.published_at ? 1 : -1;
  return BigInt(a.release_id) === BigInt(b.release_id) ? 0 : BigInt(a.release_id) > BigInt(b.release_id) ? 1 : -1;
}

function seedAllowed(bootstrap, packageExists, release) {
  requireValue(bootstrap && !packageExists && release.release_id === SEED_ID && release.version === '2.0.1',
    'Bootstrap bypass is restricted to the initial 2.0.1 seed with unavailable package metadata');
}

export async function discover(client, { bootstrap = false, releaseId = '', rebuild = false, rebuildNewest = false } = {}) {
  if (releaseId) validateId(releaseId);
  requireValue(!bootstrap || !releaseId || releaseId === SEED_ID, 'Bootstrap can only select release 395994070 (2.0.1)');
  requireValue(!rebuild || releaseId, 'Rebuild requires an explicit release_id');
  const selectedId = bootstrap ? SEED_ID : releaseId;
  const packageExists = await client.privatePackage({ allowMissing: true });
  let token;
  let uncheckedSeed = false;
  try {
    token = await client.registryToken();
  } catch (error) {
    if (!(error instanceof RegistryAuthError) || !bootstrap || packageExists) throw error;
    uncheckedSeed = true; // Explicit operator authorization, not a conclusion that HTTP 403 means absent.
  }
  const include = [];
  let pending = 0;
  let completed = 0;
  let found = !selectedId;
  // An image-definition change republishes the newest stable release. Only that
  // release is rebuilt; unrelated backlog and prereleases wait for a normal poll.
  let forcedId = null;
  if (rebuildNewest) {
    let newest = null;
    for await (const release of client.releases()) {
      const item = stableCandidate(release);
      if (item && (!newest || compareCandidate(item, newest) > 0)) newest = item;
    }
    requireValue(newest, 'No eligible stable release is available to rebuild');
    forcedId = newest.release_id;
  }
  for await (const release of client.releases()) {
    if (selectedId && apiId(release.id) !== selectedId) continue;
    if (forcedId && apiId(release.id) !== forcedId) continue;
    found = true;
    const item = candidate(release);
    if (!item) continue;
    if (item.pending) { pending += 1; continue; }
    if (uncheckedSeed) seedAllowed(bootstrap, packageExists, item);
    if (!rebuild && !forcedId && token && await client.completed(item, token)) {
      requireValue(packageExists, 'Existing image has no verified private package association');
      completed += 1;
      continue;
    }
    include.push({ ...item, bootstrap: uncheckedSeed });
    requireValue(include.length <= 256, 'More than 256 missing releases; refusing to truncate the build matrix');
  }
  requireValue(found, 'Selected release ID was not found in the fully paginated release list');
  include.sort((a, b) => Number(a.release_id) - Number(b.release_id));
  return { include, pending, completed };
}

export async function prepare(client, { version, releaseId, assetSha256, bootstrap = false, rebuild = false }) {
  validateVersion(version);
  validateId(releaseId);
  requireValue(typeof assetSha256 === 'string' && /^(?:[a-f0-9]{64})?$/.test(assetSha256), 'Invalid expected asset SHA-256');
  const item = candidate(await client.release(releaseId));
  requireValue(item && !item.pending && item.version === version && item.asset_sha256 === assetSha256,
    'Release or asset changed after discovery; retry discovery rather than build a different artifact');
  const packageExists = await client.privatePackage({ allowMissing: true });
  let skip = false;
  try {
    if (!rebuild) {
      skip = await client.completed(item, await client.registryToken());
      requireValue(!skip || packageExists, 'Existing image has no verified private package association');
    }
  } catch (error) {
    if (!(error instanceof RegistryAuthError)) throw error;
    seedAllowed(bootstrap, packageExists, item);
  }
  return { ...item, image: `${IMAGE}:${version}-r${releaseId}`, skip: String(skip) };
}

function boolean(value) {
  requireValue(['', 'false', 'true'].includes(value ?? ''), 'Invalid bootstrap flag');
  return value === 'true';
}

async function outputs(values) {
  console.log(JSON.stringify(values));
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT,
      Object.entries(values).map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}\n`).join(''));
  }
}

async function main() {
  requireValue(!process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY === REPOSITORY, 'Unexpected build repository');
  if (process.argv[2] === 'verify-origin') {
    const bytes = await readFile(process.env.IMAGE_LABELS_FILE || '');
    requireValue(bytes.length <= 64 * 1024, 'Image labels exceeded their size limit');
    let labels;
    try { labels = JSON.parse(bytes.toString('utf8')); } catch { throw new Error('Invalid image label JSON'); }
    await outputs(verifyOrigin(labels, { version: process.env.RELEASE_VERSION, releaseId: process.env.RELEASE_ID,
      sourceCommit: process.env.SOURCE_COMMIT }));
    return;
  }
  const client = new ReleaseClient({ token: process.env.GITHUB_TOKEN, actor: process.env.GITHUB_ACTOR });
  switch (process.argv[2]) {
    case 'discover': {
      const result = await discover(client, { bootstrap: boolean(process.env.BOOTSTRAP), releaseId: process.env.RELEASE_ID || '', rebuild: boolean(process.env.REBUILD), rebuildNewest: boolean(process.env.REBUILD_NEWEST) });
      if (result.include.some(item => item.bootstrap)) {
        console.error('Explicit bootstrap: initial seed authorized without proving manifest absence; GHCR pull-scope authentication was refused.');
      }
      await outputs({ matrix: { include: result.include }, count: result.include.length,
        pending: result.pending, completed: result.completed });
      break;
    }
    case 'prepare':
      await outputs(await prepare(client, { version: process.env.RELEASE_VERSION, releaseId: process.env.RELEASE_ID,
        assetSha256: process.env.ASSET_SHA256, bootstrap: boolean(process.env.BOOTSTRAP), rebuild: boolean(process.env.REBUILD) }));
      break;
    case 'verify-package':
      await client.privatePackage();
      console.log('Verified private GHCR package and private build repository');
      break;
    case 'verify-image':
      await outputs(await verifyImage(client, { image: process.env.IMAGE, digest: process.env.MANIFEST_DIGEST }));
      break;
    case 'verify-release':
      await outputs(await verifyRelease(client, { releaseId: process.env.RELEASE_ID, digest: process.env.MANIFEST_DIGEST,
        sourceCommit: process.env.SOURCE_COMMIT }));
      break;
    default:
      throw new Error('Usage: upstream-releases.mjs discover|prepare|verify-package|verify-image|verify-release|verify-origin (see README for environment)');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
