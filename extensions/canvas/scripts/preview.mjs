// Build and serve the development preview page for manual review.
// Usage: bun run preview   (PORT=8800 by default)
import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';

const out = 'preview/dist';
await mkdir(out, { recursive: true });
await build({
  entryPoints: [{ in: 'preview/entry.jsx', out: 'app' }],
  outdir: out,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
});
await copyFile('panel/style.css', `${out}/style.css`);
await copyFile('preview/index.html', `${out}/index.html`);

const port = Number(process.env.PORT ?? 8800);
const server = Bun.serve({
  port,
  hostname: '0.0.0.0',
  async fetch(request) {
    const path = new URL(request.url).pathname;
    const file = Bun.file(`${out}${path === '/' ? '/index.html' : path}`);
    return await file.exists() ? new Response(file, { headers: { 'cache-control': 'no-store' } }) : new Response('Not found', { status: 404 });
  },
});
console.log(`Canvas preview on http://localhost:${server.port}/`);
