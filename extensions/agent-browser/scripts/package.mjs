import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { unzipSync, zipSync } from 'fflate';
await import('./build.mjs');
const { version } = JSON.parse(await readFile('dist/package.json', 'utf8'));
await mkdir('dist', { recursive: true });
const output = `dist/openchamber-agent-browser-${version}.zip`;
await rm(output, { force: true });
const files = [
  'package.json', 'README.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES', 'config.example.json',
  'service/main.js', 'broker/main.js', 'panel/index.html', 'panel/main.js',
];
const entries = {};
for (const file of files) {
  entries[file] = [new Uint8Array(await readFile(`dist/${file}`)), { mtime: new Date('1980-01-01T00:00:00.000Z') }];
}
const archive = zipSync(entries, { level: 9 });
const verified = unzipSync(archive);
for (const file of files) {
  if (!verified[file]) throw new Error(`Package archive is missing ${file}`);
}
await writeFile(output, archive);
console.log(output);
