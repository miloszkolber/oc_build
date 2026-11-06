#!/usr/bin/env node
// Sandbox browser CLI: drives Obscura over CDP with playwright-core.
// One-shot commands start a private Obscura server, act, then exit.
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { connect } from 'node:net';
import { chromium } from 'playwright-core';

const USAGE = `Usage: browser <command> <url> [target] [options]

Commands:
  text <url>              Print document.body innerText
  html <url>              Print the rendered HTML
  shot <url> <file.png>   Screenshot (PNG)
  pdf <url> <file.pdf>    Print a raster PDF
  eval <url> <js>         Evaluate JS and print JSON
  script <url> <file.mjs> Run a module exporting default async (page) => {}

Options:
  --viewport WxH          Viewport size (default 1440x900)
  --full-page             Capture the whole page (shot)
  --wait-until MODE       load | domcontentloaded | networkidle (default load)
  --timeout SECONDS       Navigation timeout (default 30)
  --wait-ms MS            Wait after load
  --allow-private-network Permit loopback/RFC1918 targets (Obscura blocks them by default)
  --allow-file-access     Permit file:// navigation
  -h, --help
`;

const argv = process.argv.slice(2);
if (argv.length === 0 || argv.includes('-h') || argv.includes('--help')) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const command = argv.shift();
const options = { viewport: '1440x900', fullPage: false, waitUntil: 'load', timeout: 30, waitMs: 0, allowPrivate: false, allowFile: false };
const args = [];
while (argv.length) {
  const value = argv.shift();
  const next = () => { const v = argv.shift(); if (v === undefined) throw new Error(`${value} needs a value`); return v; };
  if (value === '--full-page') options.fullPage = true;
  else if (value === '--allow-private-network') options.allowPrivate = true;
  else if (value === '--allow-file-access') options.allowFile = true;
  else if (value === '--viewport') options.viewport = next();
  else if (value === '--wait-until') options.waitUntil = next();
  else if (value === '--timeout') options.timeout = Number(next());
  else if (value === '--wait-ms') options.waitMs = Number(next());
  else if (value.startsWith('-')) throw new Error(`Unknown option ${value}`);
  else args.push(value);
}
const [url, target] = args;
if (!['text', 'html', 'shot', 'pdf', 'eval', 'script'].includes(command)) throw new Error(`Unknown command ${command}`);
if (!url) throw new Error('A URL is required');
if (['shot', 'pdf', 'script', 'eval'].includes(command) && !target) throw new Error(`${command} needs a target argument`);
const [width, height] = options.viewport.split('x').map(Number);
if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error('Viewport must be WxH');

const port = 9300 + Math.floor(Math.random() * 600);
const child = spawn('obscura', ['serve', '--port', String(port), ...(options.allowPrivate ? ['--allow-private-network'] : []), ...(options.allowFile ? ['--allow-file-access'] : [])], { stdio: ['ignore', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', chunk => { stderr += chunk.toString(); });
child.on('exit', code => { if (code && code !== 0) process.stderr.write(`obscura exited ${code}: ${stderr.slice(-500)}\n`); });

async function endpoint() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const open = await new Promise(resolve => {
      const socket = connect({ host: '127.0.0.1', port });
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
      socket.setTimeout(300, () => { socket.destroy(); resolve(false); });
    });
    if (open) return `ws://127.0.0.1:${port}/devtools/browser`;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Obscura did not start: ${stderr.slice(-500)}`);
}

let browser;
try {
  const endpointURL = await endpoint();
  browser = await chromium.connectOverCDP(endpointURL);
  const context = browser.contexts()[0] ?? await browser.newContext();
  const page = context.pages()[0] ?? await context.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: options.waitUntil, timeout: options.timeout * 1000 });
  if (options.waitMs > 0) await page.waitForTimeout(options.waitMs);
  if (command === 'text') process.stdout.write(`${await page.evaluate(() => document.body?.innerText ?? '')}\n`);
  else if (command === 'html') process.stdout.write(`${await page.content()}\n`);
  else if (command === 'shot') { await page.screenshot({ path: target, fullPage: options.fullPage }); process.stderr.write(`screenshot written: ${target}\n`); }
  else if (command === 'pdf') { await page.pdf({ path: target, format: 'A4', printBackground: true }); process.stderr.write(`pdf written: ${target}\n`); }
  else if (command === 'eval') process.stdout.write(`${JSON.stringify(await page.evaluate(target), null, 2)}\n`);
  else {
    const module = await import(pathToFileURL(target).href);
    if (typeof module.default !== 'function') throw new Error('script must default-export an async function');
    await module.default(page, browser);
  }
} catch (error) {
  process.stderr.write(`browser: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  child.kill('SIGTERM');
  await new Promise(resolve => child.once('exit', resolve));
}
