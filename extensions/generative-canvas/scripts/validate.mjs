import { readFile, stat } from 'node:fs/promises';
import { MAX_BYTES, parseArtifact, errorMessage } from '../src/catalog.js';
const file = process.argv[2];
if (!file) { console.error('Usage: bun scripts/validate.mjs <file.canvas.json>'); process.exit(1); }
try {
  if ((await stat(file)).size > MAX_BYTES) throw new Error('Canvas exceeds 60,000 bytes');
  const artifact = parseArtifact(await readFile(file, 'utf8'));
  console.log(`Valid catalog-${artifact.catalog_version} canvas: ${artifact.title}`);
} catch (error) { console.error(errorMessage(error)); process.exitCode = 1; }
