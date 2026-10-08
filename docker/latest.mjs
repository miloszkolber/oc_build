#!/usr/bin/env node
// Only the serialized latest job may publish this alias. Canonical tags stay immutable.
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { appendFile, mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  CUTOFF, IMAGE, MANIFEST_TYPES, REPOSITORY, ReleaseClient,
  candidate, compareCandidate, requireValue, responseBytes, stableCandidate, validateId, validateVersion, verifyOrigin,
} from './releases.mjs';

const MANIFEST_LIMIT = 4 * 1024 * 1024;
const LABEL_LIMIT = 64 * 1024;
const run = promisify(execFile);
const registry = `https://ghcr.io/v2/${REPOSITORY}/manifests/`;

function digest(value) {
  requireValue(typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value), 'Expected registry SHA-256 digest');
  return value;
}

function parseJson(bytes) {
  try { return JSON.parse(bytes.toString('utf8')); } catch { throw new Error('Invalid bounded JSON response'); }
}

function mediaType(response) {
  const value = response.headers.get('content-type') || '';
  requireValue(MANIFEST_TYPES.includes(value.split(';')[0].trim()), 'Unexpected manifest media type');
  return value;
}

export class LatestClient extends ReleaseClient {
  async latestDigest(token) {
    const response = await this.request(`${registry}latest`, {
      method: 'HEAD', headers: { Authorization: `Bearer ${token}`, Accept: MANIFEST_TYPES.join(', ') },
    });
    if (response.status === 404) return null; // Called only with an authenticated pull token.
    requireValue(response.ok, `GHCR latest lookup failed (HTTP ${response.status}); not an absent alias`);
    mediaType(response);
    return digest(response.headers.get('docker-content-digest'));
  }

  async resolveCommit(revision) {
    requireValue(typeof revision === 'string' && /^[a-f0-9]{40}$/.test(revision), 'Expected retained publishing commit');
    const response = await this.github(`/repos/${REPOSITORY}/commits/${revision}`);
    requireValue(response.ok, `Publishing commit lookup failed (HTTP ${response.status})`);
    const commit = parseJson(await responseBytes(response, 1024 * 1024));
    requireValue(commit?.sha === revision, 'Publishing commit does not resolve in the private build repository');
  }

  async manifestBytes(expectedDigest, token) {
    digest(expectedDigest);
    const response = await this.request(`${registry}${expectedDigest}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: MANIFEST_TYPES.join(', ') },
    });
    requireValue(response.ok, `Canonical manifest download failed (HTTP ${response.status})`);
    const contentType = mediaType(response);
    requireValue(digest(response.headers.get('docker-content-digest')) === expectedDigest,
      'Downloaded manifest header digest changed');
    const bytes = await responseBytes(response, MANIFEST_LIMIT);
    requireValue(`sha256:${createHash('sha256').update(bytes).digest('hex')}` === expectedDigest,
      'Downloaded manifest bytes do not match the canonical digest');
    const body = parseJson(bytes);
    const type = contentType.split(';')[0].trim();
    requireValue(body && !Array.isArray(body) && body.schemaVersion === 2 && body.mediaType === type,
      'Invalid manifest JSON media identity');
    requireValue(type.includes('index') || type.includes('manifest.list')
      ? Array.isArray(body.manifests)
      : body.config && typeof body.config === 'object' && !Array.isArray(body.config) && Array.isArray(body.layers),
    'Invalid manifest or index JSON shape');
    return { bytes, contentType, digest: expectedDigest };
  }

  async publishLatest(manifest, token) {
    requireValue(Buffer.isBuffer(manifest.bytes) && manifest.bytes.length > 0 && manifest.bytes.length <= MANIFEST_LIMIT,
      'Invalid bounded manifest bytes');
    requireValue(typeof manifest.contentType === 'string' && !/[\r\n]/.test(manifest.contentType) &&
      MANIFEST_TYPES.includes(manifest.contentType.split(';')[0].trim()), 'Invalid manifest content type');
    requireValue(`sha256:${createHash('sha256').update(manifest.bytes).digest('hex')}` === digest(manifest.digest),
      'Staged manifest bytes changed');
    // Do not parse/reserialize, reconstruct an index, retag a local image, or push blobs.
    const response = await this.request(`${registry}latest`, { method: 'PUT', body: manifest.bytes, headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': manifest.contentType,
      'Content-Length': String(manifest.bytes.length),
    } });
    requireValue(response.ok, `Latest manifest publication failed (HTTP ${response.status})`);
    requireValue(response.headers.get('docker-content-digest') === manifest.digest,
      'Latest publication response did not confirm the expected digest');
  }
}

export async function selectLatest(client) {
  let selected = null;
  // No manual release_id filter and no assumption about GitHub's page ordering.
  for await (const release of client.releases()) {
    const item = stableCandidate(release);
    if (item && (!selected || compareCandidate(item, selected) > 0)) selected = item;
  }
  return selected;
}

function result(item, { outcome, remoteDigest = '', previousDigest = '', publisher = '' }) {
  return {
    outcome, version: item?.version || '', release_id: item?.release_id || '',
    selected_release: item ? `${item.version}-r${item.release_id}` : '',
    asset_sha256: item?.asset_sha256 || '', published_at: item?.published_at || '',
    digest: remoteDigest, previous_digest: previousDigest, publisher,
    alias_status: previousDigest ? 'present' : 'absent',
  };
}

export async function latestCandidate(client) {
  await client.privatePackage();
  // Choose the winner before looking at image availability: never fall back to an older image.
  const selected = await selectLatest(client);
  const token = await client.registryToken();
  const remoteDigest = selected ? await client.manifestDigest(selected, token) : null;
  const previousDigest = await client.latestDigest(token);
  return result(selected, { outcome: !selected ? 'empty' : remoteDigest ? 'ready' : 'waiting',
    remoteDigest: remoteDigest || '', previousDigest: previousDigest || '' });
}

function observation(values) {
  requireValue(values?.outcome === 'ready', 'Only a ready latest candidate can be promoted');
  const version = validateVersion(values.version);
  requireValue(!version.includes('-'), 'Latest requires a stable SemVer without a suffix');
  const release_id = validateId(values.release_id);
  requireValue(typeof values.asset_sha256 === 'string' && /^(?:[a-f0-9]{64})?$/.test(values.asset_sha256),
    'Invalid staged asset SHA-256');
  const published_at = values.published_at;
  requireValue(typeof published_at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(published_at) &&
    Number.isFinite(Date.parse(published_at)) && new Date(published_at).toISOString().replace('.000Z', 'Z') === published_at &&
    published_at >= CUTOFF, 'Invalid staged publication timestamp');
  requireValue(`${version}-r${release_id}`.length <= 128, 'Staged image tag exceeds registry limit');
  digest(values.digest);
  requireValue(['present', 'absent'].includes(values.alias_status) &&
    (values.alias_status === 'absent' ? values.previous_digest === '' : !!digest(values.previous_digest)),
  'Invalid staged alias status or digest');
  return { version, release_id, asset_sha256: values.asset_sha256, published_at,
    digest: values.digest, previous_digest: values.previous_digest, alias_status: values.alias_status };
}

export function setupFailure(values) {
  const selected = observation(values);
  return { ...result(selected, { outcome: 'failed', remoteDigest: selected.digest,
    previousDigest: selected.previous_digest }), phase: 'setup', put_attempted: false };
}

function sameCandidate(a, b) {
  return a && b && ['version', 'release_id', 'asset_sha256', 'published_at'].every(key => a[key] === b[key]);
}

async function origin(client, labels, item) {
  const verified = verifyOrigin(labels, { version: item.version, releaseId: item.release_id,
    sourceCommit: labels?.['org.opencontainers.image.revision'] });
  await client.resolveCommit(verified.revision);
  return verified.revision;
}

export async function promoteLatest(client, values, inspect = inspectImageLabels) {
  // Revalidate action outputs at the consume boundary before making any remote or Docker call.
  const selected = observation(values);
  const progress = { publisher: '', attempted: false, confirmed: false };
  try {
    return await promoteSelected(client, selected, inspect, progress);
  } catch (error) {
    error.latest = result(selected, { outcome: progress.confirmed ? 'published-unverified' : progress.attempted ? 'uncertain' : 'failed',
      remoteDigest: selected.digest, previousDigest: selected.previous_digest, publisher: progress.publisher });
    throw error;
  }
}

async function promoteSelected(client, selected, inspect, progress) {
  await client.privatePackage();
  const token = await client.registryToken();
  const publisher = await origin(client, await inspect(`${IMAGE}@${selected.digest}`), selected);
  progress.publisher = publisher;
  let previous = null;
  let rebuilt = false;
  if (selected.previous_digest && selected.previous_digest !== selected.digest) {
    const labels = await inspect(`${IMAGE}@${selected.previous_digest}`);
    const version = validateVersion(labels?.['org.opencontainers.image.version']);
    const id = validateId(labels?.['io.openchamber.upstream.release-id']);
    previous = stableCandidate(await client.release(id));
    requireValue(previous && previous.version === version, 'Current latest has no matching retained stable release');
    await origin(client, labels, previous);
    // Rebuilding a release replaces its canonical tag, so the previous alias
    // legitimately stops matching the retained digest for that same release.
    rebuilt = id === selected.release_id;
    if (!rebuilt) {
      requireValue(await client.manifestDigest(previous, token) === selected.previous_digest,
        'Current latest does not match its retained canonical digest');
    }
    requireValue(compareCandidate(previous, selected) <= 0, 'Refusing to downgrade a newer current latest release');
  }

  const unchanged = selected.previous_digest === selected.digest;
  const manifest = unchanged ? null : await client.manifestBytes(selected.digest, token);
  const writeToken = unchanged ? null : await client.registryToken('pull,push');
  // Fresh guards are intentionally after pulls, label checks, GET, and push-scope authentication.
  // Actions concurrency serializes this pipeline's writers, not arbitrary registry writers (no CAS).
  await client.privatePackage();
  requireValue(sameCandidate(await selectLatest(client), selected),
    'Latest selection changed; rediscover on the next poll instead of replaying this promotion');
  requireValue(sameCandidate(stableCandidate(await client.release(selected.release_id)), selected),
    'Selected release or asset changed; rediscover on the next poll');
  if (previous && !rebuilt) {
    requireValue(await client.manifestDigest(previous, token) === selected.previous_digest,
      'Current latest canonical digest changed; rediscover on the next poll');
  }
  requireValue(await client.manifestDigest(selected, token) === selected.digest,
    'Selected canonical digest changed; rediscover on the next poll');
  requireValue((await client.latestDigest(token) || '') === selected.previous_digest,
    'Current latest alias changed; rediscover on the next poll');
  if (unchanged) return result(selected, { outcome: 'unchanged', remoteDigest: selected.digest,
    previousDigest: selected.previous_digest, publisher });

  let uncertain = false;
  progress.attempted = true;
  try { await client.publishLatest(manifest, writeToken); } catch { uncertain = true; }
  // A rejected/timed-out PUT may have been accepted. Exactly one alias readback, never a stale retry/restore.
  let after;
  try { after = await client.latestDigest(token); } catch {
    throw new Error('Latest publication is uncertain: readback failed; no automatic replay or restore; rediscover next poll');
  }
  requireValue(after === selected.digest,
    'Latest publication is uncertain: readback differs from the expected digest; no automatic replay or restore; rediscover next poll');
  progress.confirmed = true;
  requireValue(await client.manifestDigest(selected, token) === selected.digest,
    'Latest was published but canonical digest verification failed; rediscover next poll');
  await client.privatePackage();
  return result(selected, { outcome: uncertain ? 'published-reconciled' : 'published', remoteDigest: selected.digest,
    previousDigest: selected.previous_digest, publisher });
}

export async function readLabelsFile(path) {
  const file = await open(path, 'r');
  try {
    const stat = await file.stat();
    requireValue(stat.isFile() && stat.size <= LABEL_LIMIT, 'Image labels exceeded their size limit or are not a regular file');
    const bytes = Buffer.alloc(LABEL_LIMIT + 1);
    let length = 0;
    while (length < bytes.length) {
      const part = await file.read(bytes, length, bytes.length - length, length);
      if (part.bytesRead === 0) break;
      length += part.bytesRead;
    }
    requireValue(length <= LABEL_LIMIT, 'Image labels exceeded their size limit');
    return parseJson(bytes.subarray(0, length));
  } finally { await file.close(); }
}

export async function inspectImageLabels(reference) {
  requireValue(typeof reference === 'string' && reference.startsWith(`${IMAGE}@`) &&
    digest(reference.slice(IMAGE.length + 1)), 'Expected digest-pinned private image');
  requireValue(typeof process.env.RUNNER_TEMP === 'string' && process.env.RUNNER_TEMP.length > 0, 'RUNNER_TEMP is required for label inspection');
  const directory = await mkdtemp(join(process.env.RUNNER_TEMP, 'openchamber-latest-labels-'));
  try {
    try {
      await run('docker', ['pull', reference], { timeout: 180_000, killSignal: 'SIGKILL', maxBuffer: 256 * 1024 });
    } catch { throw new Error('Digest-pinned image pull failed or exceeded its time/output limit'); }
    let stdout;
    try {
      ({ stdout } = await run('docker', ['image', 'inspect', reference, '--format', '{{json .Config.Labels}}'],
        { timeout: 20_000, killSignal: 'SIGKILL', maxBuffer: LABEL_LIMIT, encoding: 'buffer' }));
    } catch { throw new Error('Image label inspection failed or exceeded its time/output limit'); }
    const path = join(directory, 'labels.json');
    await writeFile(path, stdout, { flag: 'wx', mode: 0o600 });
    return await readLabelsFile(path);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

async function report(values) {
  console.log(JSON.stringify(values));
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT,
      Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(''));
  }
  if (process.env.GITHUB_STEP_SUMMARY && values.outcome !== 'ready') {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, [
      '### Stable latest promotion', '',
      `- Outcome: \`${values.outcome}\``,
      `- Selected release: \`${values.selected_release || 'none'}\``,
      `- Digest: \`${values.digest || (values.outcome === 'waiting' ? 'canonical image not available' : 'not observed')}\``,
      `- Previous latest digest: \`${values.previous_digest || (values.alias_status === 'absent' ? 'absent' : 'not observed')}\``,
      `- Retained publishing commit: \`${values.publisher || 'not inspected'}\``,
      ...(values.phase === 'setup' ? ['- Docker authentication/setup failed before promotion; manifest PUT was not attempted.'] : []),
      ...(values.outcome === 'waiting' ? ['- The highest eligible stable release has no canonical image yet; latest was retained (no fallback).'] : []),
      '',
    ].join('\n'));
  }
}

async function main() {
  requireValue(!process.env.GITHUB_REPOSITORY || process.env.GITHUB_REPOSITORY === REPOSITORY, 'Unexpected build repository');
  const staged = () => ({
    outcome: process.env.LATEST_OUTCOME, version: process.env.LATEST_VERSION, release_id: process.env.LATEST_RELEASE_ID,
    asset_sha256: process.env.LATEST_ASSET_SHA256, published_at: process.env.LATEST_PUBLISHED_AT,
    digest: process.env.LATEST_DIGEST, previous_digest: process.env.LATEST_PREVIOUS_DIGEST,
    alias_status: process.env.LATEST_ALIAS_STATUS,
  });
  // The failed setup reporter must work without Docker or usable credentials.
  if (process.argv[2] === 'setup-failed') {
    await report(setupFailure(staged()));
    return;
  }
  const client = new LatestClient({ token: process.env.GITHUB_TOKEN, actor: process.env.GITHUB_ACTOR });
  switch (process.argv[2]) {
    case 'candidate':
      await report(await latestCandidate(client));
      break;
    case 'promote':
      await report(await promoteLatest(client, staged()));
      break;
    default:
      throw new Error('Usage: latest-release.mjs candidate|promote|setup-failed (see README for environment)');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async error => {
    try { await report(error.latest || { ...result(null, { outcome: 'failed' }), alias_status: 'unknown' }); } catch {
      console.error('Failed to record the latest promotion result');
    }
    console.error(error.message);
    process.exitCode = 1;
  });
}
