import { readFile, writeFile, readdir } from 'node:fs/promises';
import { zipSync, unzipSync } from 'fflate';
await import('./build.mjs');
const { version } = JSON.parse(await readFile('dist/package.json', 'utf8'));
const fixed = ['package.json', 'README.md', 'VERIFICATION.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES', 'catalog.json', 'examples/cost-explorer.canvas.json', 'examples/showcase.canvas.json'];
// The panel build is code-split: main.js plus lazy chunks for Mermaid.
const panelDir = 'dist/panel';
const panel = (await readdir(panelDir, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile())
  .map(entry => {
    const full = entry.parentPath ? `${entry.parentPath}/${entry.name}` : `${panelDir}/${entry.name}`;
    return `panel/${full.replaceAll('\\', '/').replace(`${panelDir}/`, '')}`;
  });
const files = [...fixed, ...panel];
const entries = {};
for (const file of files) entries[file] = [new Uint8Array(await readFile(`dist/${file}`)), { mtime: new Date('1980-01-01T00:00:00Z') }];
const archive = zipSync(entries, { level: 9 });
const checked = unzipSync(archive);
for (const file of files) if (!checked[file]) throw new Error(`Missing ${file}`);
const output = `dist/openchamber-generative-canvas-${version}.zip`;
await writeFile(output, archive);
console.log(output, `${files.length} files`);
