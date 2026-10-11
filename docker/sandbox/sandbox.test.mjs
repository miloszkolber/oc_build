import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
const launcher = resolve(dirname(fileURLToPath(import.meta.url)), 'sandbox');
function fixture() {
  const root = mkdtempSync(resolve(tmpdir(), 'sandbox-test-'));
  mkdirSync(`${root}/bin`);
  writeFileSync(`${root}/bin/docker`, `#!/bin/bash
printf '%s\\n' "$*" >> "$PROBE_LOG"
shift 2
case "$1" in
  run) touch "$PROBE_STARTED"; if [ "$PROBE_SLEEP" = 1 ]; then echo $$ > "$PROBE_PID"; exec sleep 60; fi; exit "\${PROBE_STATUS:-0}" ;;
  rm) [ "\${PROBE_DAEMON_DOWN:-0}" != 1 ] || exit 1; if [ -f "$PROBE_PID" ]; then kill "$(cat "$PROBE_PID")" 2>/dev/null || true; fi ;;
  info) [ "\${PROBE_DAEMON_DOWN:-0}" != 1 ] || exit 1 ;;
  container) exit 1 ;;
  *) exit 0 ;;
esac
`, { mode: 0o755 });
  const env = { ...process.env, PATH: `${root}/bin:${process.env.PATH}`,
    SANDBOX_DATA: `${root}/state`, SANDBOX_UID: String(process.getuid()), SANDBOX_GID: String(process.getgid()),
    PROBE_LOG: `${root}/log`, PROBE_STARTED: `${root}/started`, PROBE_PID: `${root}/pid`, PROBE_SLEEP: '0',
    DOCKER_HOST: 'tcp://invalid:9999', DOCKER_CONTEXT: 'invalid' };
  return { root, env, run: (args = ['run', '--', 'echo', 'a b'], extra = {}) => spawnSync('bash', [launcher, ...args], { cwd: '/repo', env: { ...env, ...extra }, encoding: 'utf8' }), close: () => rmSync(root, { recursive: true, force: true }) };
}
test('status, explicit runtime, hardening and normal cleanup', () => {
  const f = fixture();
  try {
    assert.equal(f.run(undefined, { PROBE_STATUS: '7' }).status, 7);
    const log = readFileSync(f.env.PROBE_LOG, 'utf8');
    assert.ok(log.includes('--host unix:///var/run/docker.sock run'));
    assert.match(log, /--cap-drop ALL/);
    assert.match(log, /--init/);
    assert.match(log, /rm --force sandbox-run-/);
    assert.deepEqual(readdirSync(`${f.root}/state/tmp`), []);
  } finally { f.close(); }
});
test('reject root identity and missing command before Docker invocation', () => {
  const f = fixture();
  try {
    assert.equal(f.run(['run', 'id'], { SANDBOX_UID: '0' }).status, 2);
    assert.equal(f.run(['run', '--']).status, 2);
    assert.equal(existsSync(f.env.PROBE_LOG), false);
  } finally { f.close(); }
});
test('retain scratch if container cleanup cannot be confirmed', () => {
  const f = fixture();
  try {
    const result = f.run(undefined, { PROBE_DAEMON_DOWN: '1' });
    assert.equal(result.status, 0);
    assert.match(result.stderr, /cleanup unconfirmed/);
    assert.equal(readdirSync(`${f.root}/state/tmp`).length, 1);
  } finally { f.close(); }
});
test('reject unsupported physical cwd', () => {
  const f = fixture();
  try {
    const result = spawnSync('bash', [launcher, 'run', 'pwd'], { cwd: f.root, env: f.env });
    assert.equal(result.status, 2);
  } finally { f.close(); }
});
test('dev-server ports are explicit and loopback-only', () => {
  const f = fixture();
  try {
    assert.equal(f.run(['run', '--publish', '5173:5173', '--', 'echo', 'ok']).status, 0);
    assert.match(readFileSync(f.env.PROBE_LOG, 'utf8'), /--publish 127.0.0.1:5173:5173/);
    assert.equal(f.run(['run', '--publish', '0.0.0.0:5173:5173', '--', 'echo']).status, 2);
    assert.equal(f.run(['run', '--publish', '65536:80', '--', 'echo']).status, 2);
  } finally { f.close(); }
});
test('TERM removes named container and scratch', async () => {
  const f = fixture();
  const child = spawn('bash', [launcher, 'run', 'sleep', '60'], { cwd: '/repo', env: { ...f.env, PROBE_SLEEP: '1' }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 100 && !existsSync(f.env.PROBE_STARTED); i++) await new Promise(r => setTimeout(r, 20));
    assert.ok(existsSync(f.env.PROBE_STARTED));
    const ended = new Promise(r => child.once('exit', r));
    child.kill('SIGTERM');
    assert.equal(await ended, 143);
    assert.deepEqual(readdirSync(`${f.root}/state/tmp`), []);
  } finally { child.kill('SIGKILL'); f.close(); }
});
test('SIGKILL releases the run lock so stale cleanup can stop the orphan', async () => {
  const f = fixture();
  const child = spawn('bash', [launcher, 'run', 'sleep', '60'], { cwd: '/repo', env: { ...f.env, PROBE_SLEEP: '1' }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 100 && !existsSync(f.env.PROBE_STARTED); i++) await new Promise(r => setTimeout(r, 20));
    assert.ok(existsSync(f.env.PROBE_STARTED));
    const ended = new Promise(r => child.once('exit', r)); child.kill('SIGKILL'); await ended;
    const dir = resolve(f.root, 'state/tmp', readdirSync(`${f.root}/state/tmp`)[0]);
    const old = new Date(Date.now() - 2 * 86400000); utimesSync(dir, old, old);
    assert.equal(f.run(['clean']).status, 0);
    assert.equal(existsSync(dir), false);
  } finally {
    child.kill('SIGKILL');
    if (existsSync(f.env.PROBE_PID)) try { process.kill(Number(readFileSync(f.env.PROBE_PID, 'utf8')), 'SIGTERM'); } catch {}
    f.close();
  }
});
test('clean preserves locked old runs and deletes unlocked stale runs', async () => {
  const f = fixture();
  const dir = `${f.root}/state/tmp/run-locked`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/.lock`, '');
  const holder = spawn('flock', [`${dir}/.lock`, 'bash', '-c', `touch '${f.root}/held'; exec sleep 60`], { stdio: 'ignore', detached: true });
  try {
    for (let i = 0; i < 100 && !existsSync(`${f.root}/held`); i++) await new Promise(r => setTimeout(r, 20));
    assert.ok(existsSync(`${f.root}/held`));
    const old = new Date(Date.now() - 2 * 86400000);
    utimesSync(dir, old, old);
    assert.equal(f.run(['clean']).status, 0);
    assert.ok(existsSync(dir));
    const ended = new Promise(r => holder.once('exit', r)); process.kill(-holder.pid, 'SIGTERM'); await ended;
    const stale = `${f.root}/state/tmp/run-stale`;
    mkdirSync(stale); utimesSync(stale, old, old);
    assert.equal(f.run(['clean']).status, 0);
    assert.equal(existsSync(stale), false);
  } finally { holder.kill('SIGKILL'); f.close(); }
});
