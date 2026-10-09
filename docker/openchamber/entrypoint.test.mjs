import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const entrypoint = fileURLToPath(new URL('./entrypoint.sh', import.meta.url));
const tempDir = await mkdtemp(join(tmpdir(), 'openchamber-entrypoint-test-'));
let server;

try {
  let probeCount = 0;
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      assert.equal(new URL(request.url).pathname, '/api/info');
      probeCount += 1;
      if (probeCount === 1) {
        return Response.json({ status: 'starting' }, { status: 503 });
      }
      return Response.json({ version: 'fixture' });
    },
  });

  const handoffFile = join(tempDir, 'cli-args');
  const nodeShim = join(tempDir, 'node');
  await writeFile(nodeShim, `#!/bin/sh
set -eu

if [ "\${1-}" = "-e" ]; then
    exec "$ENTRYPOINT_TEST_BUN" "$@"
fi

if [ "\${1-}" != "/opt/openchamber/bin/cli.js" ]; then
    printf 'unexpected node invocation: %s\\n' "$1" >&2
    exit 90
fi

shift
printf '%s\\n' "$@" > "$ENTRYPOINT_TEST_HANDOFF"
`);
  await chmod(nodeShim, 0o755);

  await execFileAsync('/bin/sh', [entrypoint], {
    env: {
      PATH: tempDir,
      ENTRYPOINT_TEST_BUN: process.execPath,
      ENTRYPOINT_TEST_HANDOFF: handoffFile,
      OPENCODE_HOST: `http://127.0.0.1:${server.port}`,
      OPENCHAMBER_HOST: '127.0.0.1',
      OPENCHAMBER_PORT: '45123',
    },
    timeout: 10_000,
  });

  assert.equal(probeCount, 2, 'entrypoint should retry after the backend is initially unavailable');
  assert.deepEqual((await readFile(handoffFile, 'utf8')).trimEnd().split('\n'), [
    'serve',
    '--foreground',
    '--host',
    '127.0.0.1',
    '--port',
    '45123',
  ], 'entrypoint should pass the expected serve arguments to the CLI');

  console.log('entrypoint retry and CLI handoff passed');
} finally {
  await server?.stop(true);
  await rm(tempDir, { recursive: true, force: true });
}
