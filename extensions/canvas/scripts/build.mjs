import { build } from 'esbuild';
import { mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { parseManifest } from '@openchamber/sdk/schemas';
import { z } from 'zod';
import { parseArtifact, artifactSchema } from '../src/catalog.js';
import { costExplorer, revenueDashboard } from '../src/examples.js';
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const result = parseManifest(manifest);
if (!result.ok) throw new Error(JSON.stringify(result));
await rm('dist', { recursive: true, force: true });
await mkdir('dist/panel', { recursive: true });
await mkdir('dist/examples', { recursive: true });
await mkdir('dist/service', { recursive: true });
await build({ entryPoints: ['src/panel.jsx'], outfile: 'dist/panel/main.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, jsx: 'automatic', legalComments: 'eof', define: { 'process.env.NODE_ENV': '"production"' } });
await build({ entryPoints: ['src/service.js'], outfile: 'dist/service/main.js', bundle: true, format: 'esm', platform: 'node', target: 'node22', legalComments: 'eof' });
for (const file of ['index.html', 'style.css']) await copyFile(`panel/${file}`, `dist/panel/${file}`);
for (const file of ['README.md', 'VERIFICATION.md', 'LICENSE', 'NOTICE']) await copyFile(file, `dist/${file}`);
const licensePackages = ['@openchamber/sdk', '@json-render/core', '@json-render/react', 'react', 'react-dom', 'scheduler', 'zod'];
const licenses = [];
for (const name of licensePackages) {
  const pkg = JSON.parse(await readFile(`node_modules/${name}/package.json`, 'utf8'));
  let license;
  for (const filename of ['LICENSE', 'LICENSE.md', 'LICENSE.txt']) {
    try { license = await readFile(`node_modules/${name}/${filename}`, 'utf8'); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!license) throw new Error(`Missing license: ${name}`);
  licenses.push(`${name} ${pkg.version} (${pkg.license})\n\n${license}`);
}
await writeFile('dist/THIRD_PARTY_LICENSES', licenses.join('\n\n----------------------------------------\n\n'));
await writeFile('dist/package.json', JSON.stringify({ name: manifest.name, version: manifest.version, license: manifest.license, description: manifest.description, openchamber: manifest.openchamber }, null, 2) + '\n');
await writeFile('dist/examples/cost-explorer.canvas.json', JSON.stringify(parseArtifact(costExplorer), null, 2) + '\n');
await writeFile('dist/examples/revenue-pulse.canvas.json', JSON.stringify(parseArtifact(revenueDashboard), null, 2) + '\n');
await writeFile('dist/catalog.json', JSON.stringify(z.toJSONSchema(artifactSchema), null, 2) + '\n');
console.log('Built Canvas panel, catalog and example');
