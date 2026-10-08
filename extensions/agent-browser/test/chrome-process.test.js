import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { chromeArguments, createChromeProcess } from '../src/chrome-process.js';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const waitFor = async (condition, description, timeoutMs = 5_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await wait(20);
  }
  assert.fail(`Timed out waiting for ${description}`);
};

const processIsRunning = (pid) => {
  if (process.platform === 'linux') {
    try {
      const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      const state = stat.slice(stat.lastIndexOf(')') + 2).trimStart()[0];
      return Boolean(state && state !== 'Z' && state !== 'X');
    } catch {
      return false;
    }
  }
  const { status, stdout, error } = spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' });
  if (error) throw error;
  const state = stdout.trim()[0];
  return status === 0 && Boolean(state && state !== 'Z' && state !== 'X');
};

test('keeps the browser sandbox by default and can opt into the isolated sidecar mode', () => {
  const args = chromeArguments('/tmp/openchamber-agent-browser-profile');

  assert.equal(args.includes('--no-sandbox'), false);
  assert.equal(args.includes('--disable-dev-shm-usage'), false);
  assert.ok(args.includes('--user-data-dir=/tmp/openchamber-agent-browser-profile'));
  assert.ok(chromeArguments('/tmp/openchamber-agent-browser-profile', { noSandbox: true }).includes('--no-sandbox'));
});

test('kills detached Chrome descendants when the group leader exits', {
  skip: process.platform === 'win32' ? 'Detached POSIX process groups are unavailable on Windows' : false,
}, async (context) => {
  const fixtureDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'openchamber-chrome-process-test-'));
  const readyFile = path.join(fixtureDir, 'child-ready');
  const childPidFile = path.join(fixtureDir, 'child-pid');
  const releaseFile = path.join(fixtureDir, 'release-parent');
  const cleanupFile = path.join(fixtureDir, 'cleanup-child');
  const fixturePath = path.join(fixtureDir, 'chrome-fixture');
  let childPid = null;
  const childSource = `
    const fs = require('node:fs');
    fs.writeFileSync(${JSON.stringify(readyFile)}, 'ready');
    setInterval(() => {
      if (fs.existsSync(${JSON.stringify(cleanupFile)})) process.exit(0);
    }, 10);
  `;
  const fixtureSource = `
    #!${process.execPath}
    const fs = require('node:fs');
    const { spawn } = require('node:child_process');
    const child = spawn(process.execPath, ['-e', ${JSON.stringify(childSource)}], { stdio: 'ignore' });
    fs.writeFileSync(${JSON.stringify(childPidFile)}, String(child.pid));
    child.unref();
    const waitForRelease = () => {
      if (fs.existsSync(${JSON.stringify(releaseFile)})) process.exit(0);
      setTimeout(waitForRelease, 10);
    };
    waitForRelease();
  `;
  await fs.promises.writeFile(fixturePath, fixtureSource.trimStart());
  await fs.promises.chmod(fixturePath, 0o700);

  const chrome = createChromeProcess({ chromePath: fixturePath, startupTimeoutMs: 10_000 });
  context.after(async () => {
    await chrome.close();
    await fs.promises.writeFile(releaseFile, 'cleanup');
    await fs.promises.writeFile(cleanupFile, 'cleanup');
    if (childPid) {
      await waitFor(() => !processIsRunning(childPid), 'the fixture child cleanup', 1_000).catch(() => {});
    }
    await fs.promises.rm(fixtureDir, { recursive: true, force: true });
  });

  const startupFailure = assert.rejects(chrome.ensure(), /Chrome exited during startup/);
  await waitFor(() => fs.existsSync(readyFile), 'the detached child to start');
  const leader = chrome.process;
  assert.ok(leader);
  childPid = Number(await fs.promises.readFile(childPidFile, 'utf8'));
  assert.ok(Number.isInteger(childPid) && childPid > 0);
  assert.equal(processIsRunning(childPid), true, 'the child is running before the leader exits');
  assert.equal(leader.exitCode, null);
  assert.equal(leader.signalCode, null);

  await fs.promises.writeFile(releaseFile, 'exit');
  await waitFor(() => leader.exitCode !== null || leader.signalCode !== null, 'the group leader to exit');
  await startupFailure;
  await waitFor(() => !processIsRunning(childPid), 'the descendant to stop', 1_000);
  await chrome.close();
});
