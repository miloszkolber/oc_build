// Reports pinned Canvas dependencies that have a newer release on npm.
// Report-only by default; pass --strict to exit non-zero on drift.
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const wanted = { ...manifest.dependencies, ...manifest.devDependencies };

const latest = async (name) => {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, { headers: { accept: 'application/vnd.npm.install-v1+json' } });
  if (!response.ok) throw new Error(`registry responded ${response.status}`);
  return (await response.json())['dist-tags']?.latest ?? null;
};

const rows = [];
for (const [name, range] of Object.entries(wanted)) {
  const current = range.replace(/^[^0-9]*/, '');
  try {
    const next = await latest(name);
    rows.push({ name, current, next: next ?? 'unknown', drift: Boolean(next) && next !== current });
  } catch (error) {
    rows.push({ name, current, next: `error: ${error.message}`, drift: false, failed: true });
  }
}

for (const row of rows.sort((a, b) => a.name.localeCompare(b.name))) {
  const mark = row.failed ? 'ERROR ' : row.drift ? 'UPDATE' : 'ok    ';
  console.log(`${mark}  ${row.name.padEnd(24)} ${row.current.padEnd(10)} -> ${row.next}`);
}
const drifted = rows.filter(row => row.drift);
console.log(`\n${drifted.length} of ${rows.length} dependencies have a newer release.`);
if (drifted.length > 0 && process.argv.includes('--strict')) process.exitCode = 1;
