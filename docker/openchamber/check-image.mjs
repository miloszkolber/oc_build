import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
assert.notEqual(process.getuid(), 0);
assert.equal(process.versions.node.split('.')[0], '22');
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
};
assert(!existsSync('/opt/openchamber/extensions/agent-browser'), 'Archived extension must not be packaged');
{
  const root = '/opt/openchamber';
  assert.equal(JSON.parse(readFileSync(`${root}/package.json`)).version, process.env.EXPECTED_VERSION);
  for (const dir of ['bin', 'server', 'dist', 'node_modules']) assert(existsSync(`${root}/${dir}`));
  assert(!existsSync('/usr/lib/chromium/chromium'));
  assert(!existsSync(`${root}/dist/browser-panel.css`));
  run('git', ['--version']); run('sh', ['-n', '/entrypoint.sh']);
  run('ssh', ['-V']);
  run('/bin/ps', ['-axo', 'pid=,ppid=,pgid=,stat=,lstart=,comm=']);
  assert.equal(run('/usr/bin/env', ['node', '-e', 'console.log("env-node")']), 'env-node');
  assert.equal(run('sh', ['-c', 'mkdir -p /tmp/shell-check; printf shell-tools | tee /tmp/shell-check/a >/dev/null; cp /tmp/shell-check/a /tmp/shell-check/b; cat /tmp/shell-check/b | grep shell-tools; rm -rf /tmp/shell-check']), 'shell-tools');
  const pty = createRequire(`${root}/package.json`)('node-pty');
  const terminal = pty.spawn('/bin/bash', ['-c', 'printf pty-ready'], { name: 'xterm-256color', cwd: '/tmp', cols: 80, rows: 24, env: { ...process.env, HOME: '/tmp' } });
  let terminalOutput = '';
  terminal.onData(data => { terminalOutput += data; });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { terminal.kill(); reject(new Error('PTY I/O timeout')); }, 10000);
    terminal.onExit(event => { clearTimeout(timeout); event.exitCode === 0 ? resolve() : reject(new Error(`PTY exit ${event.exitCode}`)); });
  });
  assert.match(terminalOutput, /pty-ready/);
  run('sh', ['-c', 'cd /tmp && HOME=/tmp git init -q image-check && git -C image-check status --porcelain']);
  run('sh', ['-c', 'export HOME=/tmp; git -C /tmp/image-check -c user.name=ImageCheck -c user.email=image-check@example.invalid commit -q --allow-empty -m fixture; git -C /tmp/image-check worktree add -q -b probe /tmp/image-worktree; git -C /tmp/image-worktree status --porcelain; git -C /tmp/image-check worktree remove /tmp/image-worktree']);
  run('node', ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    process.env.HOME = '/tmp/image-check';
    const { isGitRepository } = await import('${root}/server/lib/git/service.js');
    const { vcsInitRefusal, unsupportedRepositoryRootReason } = await import('${root}/server/lib/git/repository-root.js');
    delete process.env.OPENCHAMBER_ALLOWED_HOME_REPOSITORY;
    assert.equal(await isGitRepository('/tmp/image-check'), false);
    process.env.OPENCHAMBER_ALLOWED_HOME_REPOSITORY = '/tmp';
    assert.equal(await isGitRepository('/tmp/image-check'), false);
    process.env.OPENCHAMBER_ALLOWED_HOME_REPOSITORY = '/tmp/image-check';
    assert.equal(await isGitRepository('/tmp/image-check'), true);
    assert.equal(await isGitRepository('/tmp'), false);
    assert.equal(unsupportedRepositoryRootReason('/'), 'filesystem-root');
    assert(vcsInitRefusal('POST', '/api/vcs/init', { 'x-opencode-directory': '/tmp/image-check' }));
    assert(vcsInitRefusal('POST', '/api/vcs/init', { 'x-opencode-directory': '/' }));
    delete process.env.OPENCHAMBER_ALLOWED_HOME_REPOSITORY;
    assert.equal(await isGitRepository('/tmp/image-check'), false);
    process.env.HOME = '/tmp';
    assert.equal(await isGitRepository('/tmp/image-check'), true);
  `]);
  assert.equal(run('node', [`${root}/bin/cli.js`, '--version']), process.env.EXPECTED_VERSION);
  for (const directory of ['bin', 'server']) for (const file of readdirSync(`${root}/${directory}`, { recursive: true })) {
    if (/\.(js|mjs|cjs)$/.test(file) && !/\.(test|spec)\./.test(file)) run('node', ['--check', `${root}/${directory}/${file}`]);
  }
  console.log('App image passed: upstream web app, Git/shell, no Chromium or archived extension');
}
