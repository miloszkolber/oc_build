import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrokerClientRuntime, parseBrokerBaseUrl } from './broker-client.js';
import { createService } from './service.js';

const DEFAULT_BROKER_URL = 'http://127.0.0.1:3001';

const readPort = (value) => {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('OPENCHAMBER_SERVICE_PORT must be an integer from 1 to 65535');
  }
  return port;
};

// OpenChamber copies the installed package so the service entry sits at
// `<extensionRoot>/service/main.js`; one directory up is the root. Resolved
// here rather than via config.js, whose policy-proxy import must not enter
// this bundle.
export const extensionRoot = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const brokerConfigPath = () => path.join(extensionRoot(), 'config.json');

const configuredBrokerUrl = (configPath) => {
  let value;
  try {
    value = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
    throw error;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.brokerUrl === undefined) return null;
  // Validated on the strict shape this client can actually dial; an invalid
  // value fails startup instead of silently reaching the default broker.
  return parseBrokerBaseUrl(value.brokerUrl, 'config.brokerUrl');
};

// OpenChamber spawns guest services with a sanitized environment, so
// OPENCHAMBER_BROWSER_BROKER_URL is normally absent outside tests and local
// runs. The extension's own config.json is the durable override.
export const resolveBrokerUrl = ({ env = process.env, configPath = brokerConfigPath() } = {}) => {
  const fromEnv = env.OPENCHAMBER_BROWSER_BROKER_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) return parseBrokerBaseUrl(fromEnv);
  return configuredBrokerUrl(configPath) ?? DEFAULT_BROKER_URL;
};

export const startService = async ({ env = process.env, runtime } = {}) => {
  const token = env.OPENCHAMBER_SERVICE_TOKEN;
  if (typeof token !== 'string' || token.length === 0) throw new Error('OPENCHAMBER_SERVICE_TOKEN is required');
  const service = createService({
    runtime: runtime ?? createBrokerClientRuntime({ baseUrl: resolveBrokerUrl({ env }) }),
    token,
    port: readPort(env.OPENCHAMBER_SERVICE_PORT),
  });
  await service.listen();
  return service;
};

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  startService().then((service) => {
    let stopping = false;
    const stop = () => {
      if (stopping) return;
      stopping = true;
      void service.close().finally(() => process.exit(0));
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
