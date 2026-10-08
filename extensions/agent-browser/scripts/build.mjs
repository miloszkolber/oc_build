import { build } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';

const output = 'dist';
await rm(output, { recursive: true, force: true });
await Promise.all([
  mkdir(`${output}/service`, { recursive: true }),
  mkdir(`${output}/broker`, { recursive: true }),
  mkdir(`${output}/panel`, { recursive: true }),
]);
await Promise.all([
  build({
    entryPoints: ['src/main.js'],
    outfile: `${output}/service/main.js`,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    sourcemap: false,
    legalComments: 'eof',
    banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  }),
  build({
    entryPoints: ['src/broker-main.js'],
    outfile: `${output}/broker/main.js`,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    sourcemap: false,
    legalComments: 'eof',
    banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" },
  }),
  build({
    entryPoints: ['src/panel.js'],
    outfile: `${output}/panel/main.js`,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    sourcemap: false,
    legalComments: 'eof',
  }),
]);

await Promise.all([
  'package.json', 'README.md', 'LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES', 'config.example.json',
].map((file) => copyFile(file, `${output}/${file}`)));
await Promise.all([
  ['panel/index.html', `${output}/panel/index.html`],
].map(([source, destination]) => copyFile(source, destination)));
console.log(`built installable extension in ${output}/`);
