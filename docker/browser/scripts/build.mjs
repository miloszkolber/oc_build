import { build } from 'esbuild';
import { mkdir, copyFile, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/main.js'], outfile: 'dist/main.js', bundle: true, platform: 'node', format: 'esm', target: 'node22', legalComments: 'eof', banner: { js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);" } });
for (const file of ['package.json', 'LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES']) await copyFile(file, `dist/${file}`);
