import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseArtifact, MAX_BYTES, errorMessage } from './catalog.js';

export const CANVAS_ROOT = '/data/.db/openchamber/canvas';
export class StoreError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const revision = content => createHash('sha256').update(content).digest('hex');
const filename = id => {
  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,100}\.canvas\.json$/.test(id)) throw new StoreError('Invalid artifact filename');
  return id;
};
export function createStore(root = CANVAS_ROOT) {
  let queue = Promise.resolve();
  const serial = task => { const next = queue.then(task); queue = next.catch(() => {}); return next; };
  async function ready() {
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const directory = await fs.lstat(root);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new StoreError('Canvas directory must be a real directory');
  }
  async function read(id) {
    await ready();
    let handle;
    try {
      handle = await fs.open(path.join(root, filename(id)), constants.O_RDONLY | constants.O_NOFOLLOW);
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_BYTES) throw new StoreError('Artifact is not a regular JSON file within 60,000 bytes');
      const buffer = Buffer.alloc(MAX_BYTES + 1); let length = 0;
      while (length < buffer.length) { const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null); if (!bytesRead) break; length += bytesRead; }
      if (length > MAX_BYTES) throw new StoreError('Canvas exceeds 60,000 bytes');
      const content = buffer.subarray(0, length).toString('utf8');
      return { id, artifact: parseArtifact(content), revision: revision(content) };
    } catch (error) { if (error.code === 'ENOENT') throw new StoreError('Artifact not found', 404); throw error; }
    finally { await handle?.close(); }
  }
  async function write(id, artifact, expected) {
    await ready();
    const value = parseArtifact(artifact), content = JSON.stringify(value) + '\n';
    parseArtifact(content);
    if (id) {
      const current = await read(id);
      if (!expected || current.revision !== expected) throw new StoreError('Artifact changed. Reload before saving.', 409);
    } else {
      const entries = await fs.readdir(root);
      if (entries.filter(name => name.endsWith('.canvas.json')).length >= 200) throw new StoreError('Canvas store exceeds 200 artifacts');
      id = `${randomUUID()}.canvas.json`;
    }
    const target = path.join(root, filename(id)), temp = path.join(root, `.${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temp, content, { flag: 'wx', mode: 0o600 });
      if (expected) await fs.rename(temp, target);
      else { await fs.link(temp, target); await fs.unlink(temp); }
    } finally { await fs.rm(temp, { force: true }); }
    return { id, artifact: value, revision: revision(content) };
  }
  return {
    read,
    list: async () => {
      await ready();
      const entries = await fs.readdir(root, { withFileTypes: true });
      const names = entries.filter(entry => entry.isFile() && /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,100}\.canvas\.json$/.test(entry.name));
      if (names.length > 200) throw new StoreError('Canvas store exceeds 200 artifacts');
      const items = [];
      for (const entry of names) {
        try { const value = await read(entry.name); items.push({ id: value.id, title: value.artifact.title, revision: value.revision }); }
        catch (error) { items.push({ id: entry.name, title: entry.name, error: errorMessage(error).slice(0, 180) }); }
      }
      return items.sort((a, b) => a.title.localeCompare(b.title));
    },
    create: artifact => serial(() => write(null, artifact)),
    update: (id, artifact, expected) => serial(() => write(id, artifact, expected)),
    rename: (id, title, expected) => serial(async () => { const value = await read(id); value.artifact.title = title; return write(id, value.artifact, expected); }),
    remove: (id, expected) => serial(async () => {
      const value = await read(id);
      if (!expected || value.revision !== expected) throw new StoreError('Artifact changed. Reload before deleting.', 409);
      await fs.unlink(path.join(root, filename(id)));
      return { deleted: true };
    }),
  };
}
