import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import { createRequire } from 'node:module';
const browser = process.env.IMAGE_KIND === 'browser';
assert.notEqual(process.getuid(), 0);
assert.equal(process.versions.node.split('.')[0], '22');
const run = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
};
assert(!existsSync('/opt/openchamber/extensions/agent-browser'), 'Archived extension must not be packaged');
if (!browser) {
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
  assert.equal(run('node', [`${root}/bin/cli.js`, '--version']), process.env.EXPECTED_VERSION);
  for (const directory of ['bin', 'server']) for (const file of readdirSync(`${root}/${directory}`, { recursive: true })) {
    if (/\.(js|mjs|cjs)$/.test(file) && !/\.(test|spec)\./.test(file)) run('node', ['--check', `${root}/${directory}/${file}`]);
  }
  console.log('App image passed: upstream web app, Git/shell, no Chromium or archived extension');
} else {
  assert(!existsSync('/opt/openchamber'));
  assert(!existsSync('/bin/bash')); assert(!existsSync('/usr/bin/git'));
  const pkg = JSON.parse(readFileSync('/opt/browser/package.json'));
  assert.equal(pkg.name, 'openchamber-browser'); assert(!pkg.openchamber);
  assert.deepEqual(readdirSync('/opt/browser').sort(), ['LICENSE', 'NOTICE', 'THIRD_PARTY_LICENSES', 'config.json', 'main.js', 'package.json'].sort());
  const bundle = readFileSync('/opt/browser/main.js', 'utf8');
  for (const component of ['Page.startScreencast', '/surface/frame', 'openchamber.sdk', '@openchamber/sdk']) assert(!bundle.includes(component), `Extension component remains: ${component}`);
  run('node', ['--check', '/opt/browser/main.js']);
  const chromeVersion = run('/usr/lib/chromium/chromium', ['--version']);
  const metadata = JSON.parse(readFileSync('/usr/share/openchamber/browser-build.json'));
  assert.equal(metadata.chromiumVersion, chromeVersion);
  assert(existsSync(metadata.nssSoftoknModule));
  const fixture = http.createServer((_req,res) => { res.setHeader('content-type','text/html');res.end('<title>Browser smoke</title><h1>Standalone browser</h1>'); });
  await new Promise(r => fixture.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${fixture.address().port}`;
  let deniedRequests = 0;
  const denied = http.createServer((_req,res) => { deniedRequests++;res.end('Denied destination reached'); });
  await new Promise(r=>denied.listen(0,'127.0.0.1',r));
  const deniedOrigin = `http://127.0.0.1:${denied.address().port}`;
  const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs');
  const temp = mkdtempSync('/tmp/browser-check-');
  writeFileSync(`${temp}/config.json`, JSON.stringify({ chromePath:'/usr/lib/chromium/chromium', allowedOrigins:[origin] }));
  const { startBroker } = await import('/opt/browser/main.js');
  // Reserve an ephemeral port for the MCP service itself.
  const reserve = http.createServer(); await new Promise(r => reserve.listen(0,'127.0.0.1',r));
  const port = reserve.address().port; await new Promise(r=>reserve.close(r));
  const broker = await startBroker({configPath:`${temp}/config.json`, env:{OPENCHAMBER_BROWSER_NO_SANDBOX:'1',OPENCHAMBER_BROWSER_MCP_TOKEN:'image-check',OPENCHAMBER_BROWSER_MCP_PORT:String(port)}});
  try {
    const base=`http://127.0.0.1:${port}`;
    assert.equal((await fetch(`${base}/mcp`,{method:'POST',body:'{}'})).status,401);
    for(const path of ['/surface/frame','/browser-control','/browser/state']) assert.equal((await fetch(base+path)).status,404);
    let id=0;
    const rpc=async(method,params={})=>(await (await fetch(`${base}/mcp`,{method:'POST',headers:{authorization:'Bearer image-check','content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params})})).json()).result;
    const initialized = await rpc('initialize',{protocolVersion:'2024-11-05'});
    assert.equal(initialized.serverInfo.name,'browser');
    assert.equal(initialized.serverInfo.version,pkg.version);
    assert.match(initialized.instructions,/standalone Chromium, not OpenChamber/);
    assert.match(initialized.instructions,/verified in MCP Chromium/);
    const tools = (await rpc('tools/list')).tools;
    assert.equal(tools.length,38);
    assert.equal(new Set(tools.map(tool=>tool.name)).size,38);
    for(const tool of tools) assert(tool.description.startsWith('Standalone Chromium (not OpenChamber native UI): '),tool.name);
    const nav=await rpc('tools/call',{name:'browser_navigate',arguments:{url:origin}});assert(!nav.isError,JSON.stringify(nav));
    for(const [width,height,color_scheme] of [[390,844,'dark'],[1440,900,'light']]) {
      const sized=await rpc('tools/call',{name:'browser_set_viewport',arguments:{width,height,color_scheme}});assert(!sized.isError,JSON.stringify(sized));
      const measured=await rpc('tools/call',{name:'browser_evaluate',arguments:{expression:'JSON.stringify({width:innerWidth,height:innerHeight,dark:matchMedia("(prefers-color-scheme: dark)").matches})'}});
      const actual=JSON.parse(measured.content.find(c=>c.type==='text').text);
      assert.deepEqual(actual,{width,height,dark:color_scheme==='dark'});
    }
    const badSize=await rpc('tools/call',{name:'browser_set_viewport',arguments:{width:0,height:844}});assert.equal(badSize.isError,true);
    const shot=await rpc('tools/call',{name:'browser_screenshot',arguments:{}});assert(shot.content.some(c=>c.type==='image'));
    await rpc('tools/call',{name:'browser_navigate',arguments:{url:deniedOrigin}});
    assert.equal(deniedRequests,0,'Blocked private destination must not receive any browser request');
  } finally { await broker.close();await new Promise(r=>fixture.close(r));await new Promise(r=>denied.close(r));rmSync(temp,{recursive:true,force:true}); }
  assert.deepEqual(readdirSync('/tmp').filter(f=>f.startsWith('openchamber-browser-')),[]);
  console.log(`Standalone browser image passed: ${chromeVersion}, 38 MCP tools, responsive layout/color preference/navigation/screenshot/auth/policy; no extension or surface API`);
}
