import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserRuntime } from './browser-runtime.js';
import { createMcpService } from './mcp-service.js';
import { loadConfig } from './config.js';

export const startBroker = async ({ env = process.env, configPath } = {}) => {
  const config = loadConfig({ entryUrl: import.meta.url, configPath: configPath ?? env.OPENCHAMBER_BROWSER_CONFIG_PATH });
  let runtime = null;
  let lastActivity = Date.now();
  let queue = Promise.resolve();
  let idleTimer = null;
  let closing = false;
  const reset = async () => { const old = runtime; runtime = null; await old?.close(); };
  const enqueue = task => { const next = queue.catch(() => {}).then(task); queue = next; return next; };
  const scheduleIdle = () => {
    clearTimeout(idleTimer);
    if (closing || !runtime) return;
    idleTimer = setTimeout(() => {
      void enqueue(async () => {
        if (runtime && Date.now() - lastActivity >= config.idleTimeoutMs) await reset();
        else scheduleIdle();
      }).catch(error => console.error(error.message));
    }, Math.max(1, config.idleTimeoutMs - (Date.now() - lastActivity)));
    idleTimer.unref();
  };
  const manager = {
    performMcp(name, args, signal) {
      return enqueue(async () => {
        signal?.throwIfAborted();
        clearTimeout(idleTimer);
        lastActivity = Date.now();
        if (!runtime) runtime = createBrowserRuntime({ ...config, noSandbox: env.OPENCHAMBER_BROWSER_NO_SANDBOX === '1' });
        try { return await runtime.performMcp(name, args, signal); }
        catch (error) { if (!runtime.browserCdp?.isOpen) await reset(); throw error; }
        finally { lastActivity = Date.now(); scheduleIdle(); }
      });
    },
    close: () => enqueue(reset),
  };
  const mcp = createMcpService({ runtime: manager, token: env.OPENCHAMBER_BROWSER_MCP_TOKEN, port: Number(env.OPENCHAMBER_BROWSER_MCP_PORT ?? 3002) });
  await mcp.listen();
  return { mcp, get address() { return mcp.address; }, async close() { closing = true; clearTimeout(idleTimer); await mcp.close(); await manager.close(); } };
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startBroker().then(broker => {
    console.log(`Browser MCP listening on ${broker.address.host}:${broker.address.port}`);
    let stopping = false;
    const stop = () => { if (stopping) return; stopping = true; void broker.close().finally(() => process.exit(0)); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
