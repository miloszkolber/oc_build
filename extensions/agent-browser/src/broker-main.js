import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserManager } from './browser-manager.js';
import { createBrowserRuntime } from './browser-runtime.js';
import { loadConfig } from './config.js';
import { createDevServerScanner } from './dev-servers.js';
import { createMcpService } from './mcp-service.js';
import { createService } from './service.js';

const port = (value, fallback, name) => {
  const parsed = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) throw new Error(`${name} must be an integer from 1 to 65535`);
  return parsed;
};

export const startBroker = async ({ env = process.env, configPath, runtime } = {}) => {
  const mcpToken = env.OPENCHAMBER_BROWSER_MCP_TOKEN;
  if (typeof mcpToken !== 'string' || mcpToken.trim().length === 0) {
    throw new Error('OPENCHAMBER_BROWSER_MCP_TOKEN is required');
  }
  const config = loadConfig({ entryUrl: import.meta.url, configPath: configPath ?? env.OPENCHAMBER_BROWSER_CONFIG_PATH });
  const devServers = config.discoverDevServers ? createDevServerScanner() : null;
  const browser = runtime ?? createBrowserManager({ createRuntime: () => createBrowserRuntime({
    ...config,
    noSandbox: env.OPENCHAMBER_BROWSER_NO_SANDBOX === '1',
    devServers,
  }) });
  const api = createService({
    runtime: browser,
    port: port(env.OPENCHAMBER_BROWSER_API_PORT, 3001, 'OPENCHAMBER_BROWSER_API_PORT'),
    // This endpoint is an internal, path-limited host-loopback bridge. It is
    // deliberately not the MCP port and never binds to a LAN interface.
    allowUnauthenticated: true,
  });
  let mcp;
  try {
    await api.listen();
    mcp = createMcpService({
      runtime: browser,
      token: mcpToken,
      port: port(env.OPENCHAMBER_BROWSER_MCP_PORT, 3000, 'OPENCHAMBER_BROWSER_MCP_PORT'),
      apiReady: () => api.address?.host === '127.0.0.1',
    });
    await mcp.listen();
  } catch (error) {
    await mcp?.close().catch(() => {});
    await api.close().catch(() => {});
    throw error;
  }
  return {
    api,
    mcp,
    get address() { return { mcp: mcp.address, api: api.address }; },
    async close() {
      await mcp.close();
      await api.close();
    },
  };
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startBroker().then((broker) => {
    console.log(`[agent-browser] MCP ready at http://${broker.address.mcp.host}:${broker.address.mcp.port}/mcp; private guest API at http://${broker.address.api.host}:${broker.address.api.port}`);
    let stopping = false;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      void broker.close().finally(() => process.exit(0));
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
