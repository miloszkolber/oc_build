import dns from 'node:dns';
import { createHash } from 'node:crypto';
import http from 'node:http';
import net from 'node:net';

const ALWAYS_DENIED_V4 = new net.BlockList();
const ALWAYS_DENIED_V6 = new net.BlockList();
const PRIVATE_V4 = new net.BlockList();
const PRIVATE_V6 = new net.BlockList();

for (const [network, prefix] of [
  ['0.0.0.0', 8], ['100.64.0.0', 10], ['169.254.0.0', 16], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.88.99.0', 24], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) ALWAYS_DENIED_V4.addSubnet(network, prefix, 'ipv4');

for (const [network, prefix] of [
  ['::', 128], ['64:ff9b::', 96], ['100::', 64], ['2001::', 32], ['2001:db8::', 32],
  ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['::ffff:0:0', 96],
]) ALWAYS_DENIED_V6.addSubnet(network, prefix, 'ipv6');

for (const [network, prefix] of [
  ['10.0.0.0', 8], ['127.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16],
]) PRIVATE_V4.addSubnet(network, prefix, 'ipv4');
PRIVATE_V6.addAddress('::1', 'ipv6');

// DNS names may be canonicalized for lookup/security checks, but origin grants
// must retain a trailing dot because `localhost.` is a distinct serialized host.
const normalizeHostname = (host) => String(host || '').replace(/^\[|\]$/g, '').toLowerCase();
const normalizeDnsHostname = (host) => normalizeHostname(host).replace(/\.$/, '');
const normalizeAddress = (address) => String(address || '').replace(/^\[|\]$/g, '').toLowerCase();
const familyOf = (address) => net.isIP(address) === 6 ? 'ipv6' : 'ipv4';
export const isPrivateAddress = (address) => {
  const normalized = normalizeAddress(address);
  return familyOf(normalized) === 'ipv6'
    ? PRIVATE_V6.check(normalized, 'ipv6')
    : PRIVATE_V4.check(normalized, 'ipv4');
};

const permanentlyDenied = (address) => {
  const normalized = normalizeAddress(address);
  const family = familyOf(normalized);
  if (!net.isIP(normalized)) return 'DNS returned an invalid address';
  const denied = family === 'ipv6'
    ? ALWAYS_DENIED_V6.check(normalized, family)
    : ALWAYS_DENIED_V4.check(normalized, family);
  if (!denied) return null;
  if (family === 'ipv6' && normalized.startsWith('::ffff:')) {
    return 'IPv4-mapped addresses are denied';
  }
  if (family === 'ipv4' && normalized.startsWith('169.254.')) return 'IPv4 link-local addresses are denied';
  return 'Unspecified, link-local, transition, multicast, CGNAT, or reserved addresses are denied';
};

const grantProtocol = (protocol) => protocol === 'ws:' ? 'http:' : protocol === 'wss:' ? 'https:' : protocol;

const LOOPBACK_ADDRESSES = ['127.0.0.1', '::1'];

// A host grant matches the name the page asked for, never an address that name
// resolves to. Only discovered loopback listeners may also grant localhost,
// which the proxy pins itself instead of asking DNS. Network blocks match by address.
const hasGrant = (grants, hostname, address, port, protocol, allowLocalhostAlias = false) => grants.some((grant) => {
  if (grant.block) {
    return grant.ports.some(([first, last]) => port >= first && port <= last) && grant.block.check(address, familyOf(address));
  }
  const host = normalizeHostname(grant.host);
  const requestedProtocol = grantProtocol(protocol);
  const grantProtocolMatches = allowLocalhostAlias
    ? requestedProtocol === 'http:' && (!grant.protocol || grant.protocol === 'http:')
    : !grant.protocol || grant.protocol === requestedProtocol;
  return grant.port === port
    && grantProtocolMatches
    && (host === hostname || (allowLocalhostAlias && hostname === 'localhost' && host === address && LOOPBACK_ADDRESSES.includes(address)));
});

export const classifyProxyTarget = async (target, {
  grants = [],
  devServerGrants = null,
  lookup = dns.promises.lookup,
  signal = null,
} = {}) => {
  signal?.throwIfAborted();
  let url;
  try {
    url = target instanceof URL ? new URL(target) : new URL(String(target));
  } catch {
    return { allowed: false, reason: 'Invalid proxy target' };
  }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
    return { allowed: false, reason: 'Unsupported proxy target protocol' };
  }
  const hostname = normalizeHostname(url.hostname);
  const port = Number(url.port || (url.protocol === 'https:' || url.protocol === 'wss:' ? 443 : 80));
  if (!hostname || !Number.isInteger(port) || port < 1 || port > 65535) {
    return { allowed: false, reason: 'Invalid proxy target authority' };
  }
  if (normalizeDnsHostname(hostname) === 'metadata.google.internal') {
    return { allowed: false, reason: 'Cloud metadata host is denied' };
  }

  // Live development servers are looked up only when a private target needs a grant.
  let resolvedGrants = null;
  const grantsFor = async () => {
    resolvedGrants ??= {
      explicit: grants,
      discovered: devServerGrants ? await devServerGrants(signal) : [],
    };
    const result = await resolvedGrants;
    signal?.throwIfAborted();
    return result;
  };
  const hasPolicyGrant = async (hostname, address, port, protocol) => {
    const { explicit, discovered } = await grantsFor();
    return hasGrant(explicit, hostname, address, port, protocol)
      || hasGrant(discovered, hostname, address, port, protocol, true);
  };

  let answers;
  // An exact localhost request uses the loopback family that has a grant, so
  // a server listening on only one of them still works when DNS lists both.
  if (hostname === 'localhost') {
    const { explicit, discovered } = await grantsFor();
    const address = LOOPBACK_ADDRESSES.find((candidate) => (
      hasGrant(explicit, hostname, candidate, port, url.protocol)
      || hasGrant(discovered, hostname, candidate, port, url.protocol, true)
    ));
    if (address) answers = [{ address, family: net.isIP(address) }];
  }
  if (!answers && net.isIP(hostname)) {
    answers = [{ address: hostname, family: net.isIP(hostname) }];
  } else if (!answers) {
    try {
      answers = await lookup(hostname, { all: true, verbatim: true, signal });
      signal?.throwIfAborted();
    } catch (error) {
      if (signal?.aborted) throw error;
      return { allowed: false, reason: 'DNS resolution failed' };
    }
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return { allowed: false, reason: 'DNS returned no addresses' };
  }
  for (const answer of answers) {
    const address = normalizeAddress(answer?.address);
    const reason = permanentlyDenied(address);
    if (reason) return { allowed: false, reason };
    if (isPrivateAddress(address) && !(await hasPolicyGrant(hostname, address, port, url.protocol))) {
      return { allowed: false, reason: 'Private or loopback address requires an allowed origin', grantable: true };
    }
  }
  const pinned = answers[0];
  return {
    allowed: true,
    address: normalizeAddress(pinned.address),
    family: Number(pinned.family) || net.isIP(pinned.address),
    port,
    url,
  };
};

const CONNECT_TIMEOUT_MS = 5_000; // Establishment deadline only; established streaming responses remain open.
const HTTP_CLASSIFICATION_TIMEOUT_MS = 5_000; // Bounds DNS and discovery classification before an upstream is opened.
const MAX_PENDING_HTTP_REQUESTS = 32; // Admission remains held through response close/completion.
const MAX_PENDING_CLASSIFICATIONS = 32; // Timed-out callers do not free work that ignores cancellation.
const WEBSOCKET_HANDSHAKE_TIMEOUT_MS = 5_000;
const WEBSOCKET_HANDSHAKE_MAX_BYTES = 16 * 1024;
const WEBSOCKET_PENDING_DATA_MAX_BYTES = 64 * 1024;
const MAX_PENDING_WEBSOCKET_CONNECTS = 32;
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const HEADER_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const REPEATABLE_WEBSOCKET_HEADERS = new Set([
  'accept', 'accept-encoding', 'accept-language', 'cache-control', 'connection', 'cookie',
  'pragma', 'sec-websocket-extensions', 'sec-websocket-protocol',
]);

const hasControlCharacters = (value) => /[\x00-\x1f\x7f]/.test(value);

const parseWebSocketProtocols = (values) => {
  const protocols = [];
  for (const value of values) {
    const tokens = value.split(',');
    if (tokens.some((token) => !HEADER_NAME.test(token.trim()))) return null;
    protocols.push(...tokens.map((token) => token.trim()));
  }
  return protocols;
};

const splitExtensionList = (values) => {
  const entries = [];
  let entry = '';
  let quoted = false;
  let escaped = false;
  for (const value of values) {
    for (const character of `${value},`) {
      if (escaped) {
        entry += character;
        escaped = false;
      } else if (quoted && character === '\\') {
        entry += character;
        escaped = true;
      } else if (character === '"') {
        entry += character;
        quoted = !quoted;
      } else if (character === ',' && !quoted) {
        if (!entry.trim()) return null;
        entries.push(entry.trim());
        entry = '';
      } else {
        entry += character;
      }
    }
  }
  return quoted || escaped || entry.trim() ? null : entries;
};

const parseWebSocketExtensions = (values) => {
  if (values.length === 0) return [];
  if (values.reduce((total, value) => total + value.length, 0) > WEBSOCKET_HANDSHAKE_MAX_BYTES) return null;
  const entries = splitExtensionList(values);
  if (!entries) return null;
  const extensions = [];
  for (const entry of entries) {
    let offset = 0;
    const skipWhitespace = () => {
      while (entry[offset] === ' ' || entry[offset] === '\t') offset += 1;
    };
    const readToken = () => {
      const start = offset;
      while (offset < entry.length && HEADER_NAME.test(entry[offset])) offset += 1;
      return offset === start ? null : entry.slice(start, offset);
    };
    skipWhitespace();
    const name = readToken();
    if (!name) return null;
    const parameters = new Map();
    while (offset < entry.length) {
      skipWhitespace();
      if (offset === entry.length) break;
      if (entry[offset] !== ';') return null;
      offset += 1;
      skipWhitespace();
      const parameterName = readToken();
      if (!parameterName) return null;
      const lowerName = parameterName.toLowerCase();
      if (parameters.has(lowerName)) return null;
      skipWhitespace();
      let parameterValue = null;
      if (entry[offset] === '=') {
        offset += 1;
        skipWhitespace();
        if (entry[offset] === '"') {
          offset += 1;
          let value = '';
          let terminated = false;
          while (offset < entry.length) {
            const character = entry[offset++];
            if (character === '"') {
              terminated = true;
              break;
            }
            if (character === '\\') {
              if (offset >= entry.length) return null;
              const escaped = entry[offset++];
              if (escaped < ' ' || escaped > '~') return null;
              value += escaped;
            } else {
              if (character < ' ' || character > '~') return null;
              value += character;
            }
          }
          if (!terminated) return null;
          parameterValue = value;
        } else {
          parameterValue = readToken();
          if (!parameterValue) return null;
        }
      }
      parameters.set(lowerName, parameterValue);
    }
    extensions.push({ name: name.toLowerCase(), parameters });
  }
  return extensions;
};

const validWindowBits = (value) => typeof value === 'string' && /^(?:[89]|1[0-5])$/.test(value);

const validWebSocketExtensionOffers = (extensions) => extensions.every(({ name, parameters }) => {
  if (name !== 'permessage-deflate') return true;
  for (const [parameter, value] of parameters) {
    if (parameter === 'server_no_context_takeover' || parameter === 'client_no_context_takeover') {
      if (value !== null) return false;
    } else if (parameter === 'server_max_window_bits') {
      if (!validWindowBits(value)) return false;
    } else if (parameter === 'client_max_window_bits') {
      if (value !== null && !validWindowBits(value)) return false;
    } else {
      return false;
    }
  }
  return true;
});

const extensionSelectionMatchesOffer = (selection, offer) => {
  if (selection.name !== offer.name) return false;
  for (const [name, value] of selection.parameters) {
    const offered = offer.parameters.get(name);
    if (selection.name === 'permessage-deflate') {
      if (name === 'server_no_context_takeover' || name === 'client_no_context_takeover') {
        if (value !== null) return false;
        continue;
      }
      if (name === 'server_max_window_bits') {
        if (!validWindowBits(value) || (offer.parameters.has(name) && Number(value) > Number(offered))) return false;
        continue;
      }
      if (name === 'client_max_window_bits') {
        if (!offer.parameters.has(name) || !validWindowBits(value)) return false;
        if (offered !== null && !validWindowBits(offered)) return false;
        continue;
      }
      return false;
    }
    if (!offer.parameters.has(name) || value !== offered) {
      return false;
    }
  }
  if (selection.name === 'permessage-deflate'
    && ((offer.parameters.has('server_no_context_takeover') && !selection.parameters.has('server_no_context_takeover'))
      || (offer.parameters.has('server_max_window_bits') && !selection.parameters.has('server_max_window_bits')))) {
    return false;
  }
  return true;
};

const websocketNegotiationMatches = (parsedHeaders, { protocols = [], extensions = [] }) => {
  const values = (name) => parsedHeaders.filter((headerValue) => headerValue.lowerName === name).map(({ value }) => value);
  const selectedProtocols = values('sec-websocket-protocol');
  if (selectedProtocols.length > 1) return false;
  if (selectedProtocols.length === 1) {
    const selected = selectedProtocols[0];
    if (!HEADER_NAME.test(selected) || !protocols.includes(selected)) return false;
  }

  const selectedExtensions = parseWebSocketExtensions(values('sec-websocket-extensions'));
  if (!selectedExtensions) return false;
  const remainingOffers = [...extensions];
  for (const selection of selectedExtensions) {
    const index = remainingOffers.findIndex((offer) => extensionSelectionMatchesOffer(selection, offer));
    if (index === -1) return false;
    remainingOffers.splice(index, 1);
  }
  return true;
};

// CONNECT uses authority-form, not a URL. Require an explicit canonical port
// and feed the resulting absolute URL to the same host/port grant classifier.
const parseConnectAuthority = (request) => {
  const authority = request.url;
  if (typeof authority !== 'string' || authority.length === 0 || hasControlCharacters(authority)) return null;
  const match = authority.match(/^(\[[0-9A-Fa-f:.]+\]|[^:/\[\]@?#%\\\s]+):([0-9]+)$/);
  if (!match || String(Number(match[2])) !== match[2]) return null;
  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  const hostname = match[1];
  if (hostname.startsWith('[') && net.isIP(hostname.slice(1, -1)) !== 6) return null;
  let url;
  try {
    url = new URL(`https://${authority}/`);
  } catch {
    return null;
  }
  if (!url.hostname || Number(url.port || 443) !== port) return null;

  const headers = request.rawHeaders ?? [];
  if (headers.length % 2 !== 0) return null;
  let hostCount = 0;
  let hostValue = null;
  for (let index = 0; index < headers.length; index += 2) {
    const name = headers[index];
    const value = headers[index + 1];
    if (!HEADER_NAME.test(name) || hasControlCharacters(value)) return null;
    const lowerName = name.toLowerCase();
    if (lowerName === 'content-length' || lowerName === 'transfer-encoding') return null;
    if (lowerName === 'host') {
      hostCount += 1;
      hostValue = value;
    }
  }
  if (hostCount !== 1 || hostValue !== authority) return null;
  return { authority, url };
};

const hasHttpOriginGrant = async (decision, policy, signal = null) => {
  const hostname = normalizeHostname(decision.url.hostname);
  const port = decision.port;
  const matches = (grants, allowLocalhostAlias = false) => grants.some((grant) => {
    if (!grant || grant.block) return false;
    const host = normalizeHostname(grant.host);
    return grant.port === port
      && (!grant.protocol || grant.protocol === 'http:')
      && (host === hostname || (allowLocalhostAlias && hostname === 'localhost'
        && host === decision.address && LOOPBACK_ADDRESSES.includes(decision.address)));
  });
  if (matches(policy.grants ?? [])) return true;
  if (!isPrivateAddress(decision.address) || typeof policy.devServerGrants !== 'function') return false;
  try {
    const discovered = await policy.devServerGrants(signal);
    signal?.throwIfAborted();
    return Array.isArray(discovered) && matches(discovered, true);
  } catch (error) {
    if (signal?.aborted) throw error;
    return false;
  }
};

const parseWebSocketHandshake = (header, connectAuthority) => {
  const bytes = header.subarray(0, header.length - 4);
  for (const byte of bytes) {
    if ((byte < 0x20 && byte !== 0x0d && byte !== 0x0a) || byte > 0x7e) return null;
  }
  const lines = bytes.toString('latin1').split('\r\n');
  const requestLine = lines.shift();
  const requestMatch = requestLine?.match(/^GET (\/[^ ]*) HTTP\/1\.1$/);
  if (!requestMatch || requestMatch[1].includes('#')) return null;

  const parsedHeaders = [];
  const counts = new Map();
  for (const line of lines) {
    if (!line || /^[ \t]/.test(line)) return null;
    const separator = line.indexOf(':');
    if (separator < 1) return null;
    const name = line.slice(0, separator);
    if (!HEADER_NAME.test(name)) return null;
    const lowerName = name.toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (hasControlCharacters(value)) return null;
    counts.set(lowerName, (counts.get(lowerName) ?? 0) + 1);
    parsedHeaders.push({ name, lowerName, value });
  }
  for (const [name, count] of counts) {
    if (count > 1 && !REPEATABLE_WEBSOCKET_HEADERS.has(name)) return null;
  }
  if (parsedHeaders.some(({ lowerName }) => lowerName === 'content-length' || lowerName === 'transfer-encoding')) return null;

  const values = (name) => parsedHeaders.filter((headerValue) => headerValue.lowerName === name).map(({ value }) => value);
  const hostValues = values('host');
  const upgrades = values('upgrade');
  const keys = values('sec-websocket-key');
  const versions = values('sec-websocket-version');
  const protocols = parseWebSocketProtocols(values('sec-websocket-protocol'));
  const extensions = parseWebSocketExtensions(values('sec-websocket-extensions'));
  const connections = values('connection').flatMap((value) => value.split(',').map((token) => token.trim().toLowerCase()));
  if (hostValues.length !== 1 || hostValues[0] !== connectAuthority
    || upgrades.length !== 1 || upgrades[0].toLowerCase() !== 'websocket'
    || keys.length !== 1 || versions.length !== 1 || versions[0] !== '13'
    || !connections.includes('upgrade') || !protocols || !extensions || !validWebSocketExtensionOffers(extensions)) return null;
  if (connections.some((token) => !HEADER_NAME.test(token))) return null;
  const key = keys[0];
  const decodedKey = Buffer.from(key, 'base64');
  if (decodedKey.length !== 16 || decodedKey.toString('base64') !== key) return null;

  const connectionTokens = new Set(connections.filter((token) => token !== 'upgrade'));
  if (['host', 'upgrade', 'connection', 'sec-websocket-key', 'sec-websocket-version'].some((name) => connectionTokens.has(name))) return null;
  const sanitizedHeaders = [
    `Host: ${connectAuthority}`,
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Key: ${key}`,
    'Sec-WebSocket-Version: 13',
  ];
  for (const { name, lowerName, value } of parsedHeaders) {
    if (['host', 'upgrade', 'connection', 'sec-websocket-key', 'sec-websocket-version', 'proxy-connection', 'proxy-authorization'].includes(lowerName)
      || connectionTokens.has(lowerName)) continue;
    sanitizedHeaders.push(`${name}: ${value}`);
  }
  return {
    request: `${requestLine}\r\n${sanitizedHeaders.join('\r\n')}\r\n\r\n`,
    key,
    protocols,
    extensions,
  };
};

const malformedHeaderBytes = (buffer) => {
  for (let index = 0; index < buffer.length; index += 1) {
    const byte = buffer[index];
    if ((byte < 0x20 && byte !== 0x0d && byte !== 0x0a) || byte > 0x7e) return true;
    if (byte === 0x0a && (index === 0 || buffer[index - 1] !== 0x0d)) return true;
    if (byte === 0x0d && index + 1 < buffer.length && buffer[index + 1] !== 0x0a) return true;
  }
  return false;
};

const expectedWebSocketAccept = (key) => createHash('sha1').update(`${key}${WEBSOCKET_GUID}`).digest('base64');

const parseWebSocketUpgradeResponse = (header, key, offers = {}) => {
  const bytes = header.subarray(0, header.length - 4);
  const lines = bytes.toString('latin1').split('\r\n');
  const statusLine = lines.shift();
  if (!/^HTTP\/1\.1 101(?: [\x20-\x7e]*)?$/.test(statusLine ?? '')) return false;

  const parsedHeaders = [];
  for (const line of lines) {
    if (!line || /^[ \t]/.test(line)) return false;
    const separator = line.indexOf(':');
    if (separator < 1) return false;
    const name = line.slice(0, separator);
    if (!HEADER_NAME.test(name)) return false;
    const lowerName = name.toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (hasControlCharacters(value)) return false;
    parsedHeaders.push({ lowerName, value });
  }

  const values = (name) => parsedHeaders.filter((value) => value.lowerName === name).map(({ value }) => value);
  const upgrades = values('upgrade');
  const accepts = values('sec-websocket-accept');
  const connectionTokens = values('connection').flatMap((value) => value.split(',').map((token) => token.trim().toLowerCase()));
  if (upgrades.length !== 1 || upgrades[0].toLowerCase() !== 'websocket'
    || accepts.length !== 1 || accepts[0] !== expectedWebSocketAccept(key)
    || connectionTokens.some((token) => !HEADER_NAME.test(token))
    || !connectionTokens.includes('upgrade')
    || parsedHeaders.some(({ lowerName }) => ['content-length', 'transfer-encoding', 'trailer'].includes(lowerName))
    || !websocketNegotiationMatches(parsedHeaders, offers)) {
    return false;
  }
  return true;
};

const parseDirectWebSocketHandshake = (request, target) => {
  if (request.method !== 'GET' || request.httpVersion !== '1.1' || target.hash || target.username || target.password) return null;
  const rawHeaders = request.rawHeaders ?? [];
  if (rawHeaders.length % 2 !== 0) return null;
  let hostCount = 0;
  let hostValue = null;
  const headerLines = [];
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    const value = rawHeaders[index + 1];
    if (!HEADER_NAME.test(name) || typeof value !== 'string' || /[^\x20-\x7e]/.test(value)) return null;
    if (name.toLowerCase() === 'host') {
      hostCount += 1;
      hostValue = value;
    }
    headerLines.push([name, value]);
  }
  const authority = target.host;
  if (hostCount !== 1 || hostValue.trim() !== hostValue) return null;
  let hostUrl;
  try {
    hostUrl = new URL(`ws://${hostValue}/`);
  } catch {
    return null;
  }
  const targetPort = Number(target.port || 80);
  const hostPort = Number(hostUrl.port || 80);
  if (hostUrl.username || hostUrl.password || hostUrl.pathname !== '/' || hostUrl.search || hostUrl.hash
    || normalizeHostname(hostUrl.hostname) !== normalizeHostname(target.hostname)
    || hostPort !== targetPort) return null;
  const lines = [`${request.method} ${target.pathname}${target.search} HTTP/${request.httpVersion}`];
  for (const [name, value] of headerLines) {
    lines.push(`${name}: ${name.toLowerCase() === 'host' ? authority : value}`);
  }
  const bytes = Buffer.from(`${lines.join('\r\n')}\r\n\r\n`, 'latin1');
  if (bytes.length > WEBSOCKET_HANDSHAKE_MAX_BYTES) return null;
  return parseWebSocketHandshake(bytes, authority);
};

const openWebSocketUpstream = ({
  client,
  decision,
  request,
  key,
  protocols,
  extensions,
  initialClientData = [],
  trackSocket,
  isActive,
  releaseGate,
  onFailure,
}) => {
  let upstream = null;
  let terminated = false;
  let upgraded = false;
  let connectTimer = null;
  let responseTimer = null;
  let clientDataListener = null;
  let clientEndListener = null;
  let responseDataListener = null;
  let responseEndListener = null;
  let responseBuffer = Buffer.alloc(0);
  let pendingClientBytes = 0;
  const pendingClientData = [];

  const clearTimers = () => {
    clearTimeout(connectTimer);
    clearTimeout(responseTimer);
    connectTimer = null;
    responseTimer = null;
  };
  const removePendingListeners = () => {
    if (clientDataListener) client.removeListener('data', clientDataListener);
    if (clientEndListener) client.removeListener('end', clientEndListener);
    if (responseDataListener) upstream?.removeListener('data', responseDataListener);
    if (responseEndListener) upstream?.removeListener('end', responseEndListener);
    clientDataListener = null;
    clientEndListener = null;
    responseDataListener = null;
    responseEndListener = null;
  };
  const cleanup = () => {
    clearTimers();
    removePendingListeners();
    releaseGate();
  };
  const fail = () => {
    if (terminated) return;
    terminated = true;
    cleanup();
    upstream?.destroy();
    if (isActive()) onFailure({ afterUpgrade: upgraded });
  };
  client.once('close', () => {
    if (terminated) return;
    terminated = true;
    cleanup();
    upstream?.destroy();
  });

  const queueClientData = (chunk) => {
    if (chunk.length === 0) return true;
    if (pendingClientBytes + chunk.length > WEBSOCKET_PENDING_DATA_MAX_BYTES) return false;
    pendingClientBytes += chunk.length;
    pendingClientData.push(chunk);
    return true;
  };
  for (const chunk of initialClientData) {
    if (!queueClientData(chunk)) return fail();
  }
  clientDataListener = (chunk) => {
    if (!terminated && !upgraded && !queueClientData(chunk)) fail();
  };
  clientEndListener = () => fail();
  client.on('data', clientDataListener);
  client.once('end', clientEndListener);

  connectTimer = setTimeout(fail, CONNECT_TIMEOUT_MS);
  connectTimer.unref?.();
  upstream = trackSocket(net.connect({
    host: decision.address,
    family: decision.family,
    port: decision.port,
  }));
  upstream.on('error', fail);
  upstream.once('close', fail);
  upstream.once('connect', () => {
    if (terminated || !isActive()) return fail();
    clearTimeout(connectTimer);
    connectTimer = null;
    responseDataListener = (chunk) => {
      if (terminated || upgraded) return;
      const scanLength = Math.min(chunk.length, WEBSOCKET_HANDSHAKE_MAX_BYTES + 4 - responseBuffer.length);
      const scanned = chunk.subarray(0, scanLength);
      const candidate = responseBuffer.length > 0 ? Buffer.concat([responseBuffer, scanned]) : scanned;
      const terminator = candidate.indexOf('\r\n\r\n');
      if (terminator < 0) {
        if (malformedHeaderBytes(candidate)
          || responseBuffer.length + chunk.length >= WEBSOCKET_HANDSHAKE_MAX_BYTES
          || scanLength < chunk.length) return fail();
        responseBuffer = candidate;
        return;
      }
      const headerLength = terminator + 4;
      const responseHeader = candidate.subarray(0, headerLength);
      if (headerLength > WEBSOCKET_HANDSHAKE_MAX_BYTES
        || malformedHeaderBytes(candidate.subarray(0, terminator))
        || !parseWebSocketUpgradeResponse(responseHeader, key, { protocols, extensions })) return fail();

      upgraded = true;
      cleanup();
      for (const bytes of pendingClientData) if (bytes.length > 0) upstream.write(bytes);
      client.write(responseHeader);
      for (const bytes of [candidate.subarray(headerLength), chunk.subarray(scanLength)]) {
        if (bytes.length > 0) client.write(bytes);
      }
      client.pipe(upstream);
      upstream.pipe(client);
    };
    responseEndListener = () => fail();
    upstream.on('data', responseDataListener);
    upstream.once('end', responseEndListener);
    responseTimer = setTimeout(fail, WEBSOCKET_HANDSHAKE_TIMEOUT_MS);
    responseTimer.unref?.();
    upstream.write(request);
  });
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

const originOf = (target) => {
  try {
    const { origin } = new URL(target);
    return origin === 'null' ? null : origin;
  } catch {
    return null;
  }
};

const isLoopbackOrigin = (origin) => {
  try {
    return /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])$/.test(new URL(origin).hostname);
  } catch {
    return false;
  }
};

const deniedPage = (reason, { origin = null, grantable = false, configPath = null, discoverDevServers = false }) => {
  const shownOrigin = origin ? `<code>${escapeHtml(origin)}</code>` : '';
  const configFile = configPath ? `<code>${escapeHtml(configPath)}</code>` : 'the extension\'s <code>config.json</code>';
  // Discovery only grants loopback listeners, so it is only mentioned for them.
  const discovery = !isLoopbackOrigin(origin) ? ''
    : discoverDevServers
      ? '<p>Development-server discovery is on, but no eligible server is listening on this port. Servers run by OpenChamber itself, OpenCode, or this extension are never granted.</p>'
      : '<p>To reach local development servers without listing each one, set <code>"discoverDevServers": true</code> instead.</p>';
  const [title, content] = grantable && origin ? [
    `Blocked: ${origin}`,
    `<h1>This private address is blocked</h1>
<p>${shownOrigin} points to the machine running OpenChamber or its local network. Agent Browser blocks private and loopback addresses until you allow them, so pages and agents cannot reach those services without permission.</p>
<p>To allow it, add the origin to <code>allowedOrigins</code> in ${configFile} and restart the extension:</p>
<pre>${escapeHtml(`{\n  "allowedOrigins": [${JSON.stringify(origin)}]\n}`)}</pre>
<p>For several machines or ports, add a private CIDR block and its ports to <code>allowedNetworks</code> instead.</p>
${discovery}
<p class="note"><code>localhost</code> and private addresses resolve on the machine running OpenChamber, not on your device.</p>`,
  ] : [
    `Can't open ${origin ?? 'this address'}`,
    `<h1>This address can't be opened</h1>
<p>${shownOrigin ? `${shownOrigin}: ` : ''}${escapeHtml(reason)}.</p>`,
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; font: 15px/1.55 system-ui, sans-serif; }
body { display: grid; min-height: 100vh; margin: 0; place-items: center; background: Canvas; color: CanvasText; }
main { box-sizing: border-box; width: 100%; max-width: 560px; padding: 32px 24px; }
small { font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .55; }
h1 { margin: 6px 0 12px; font-size: 20px; line-height: 1.3; }
p, pre { margin: 0 0 12px; }
code, pre { font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
code { overflow-wrap: anywhere; }
pre { padding: 12px 14px; white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 8px; background: rgba(127, 127, 127, .12); }
.note { font-size: 13px; opacity: .7; }
</style>
</head>
<body><main><small>Agent Browser</small>
${content}
</main></body>
</html>
`;
};

const denyHttp = (response, reason, page = {}) => {
  response.writeHead(403, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
    'cache-control': 'no-store',
    connection: 'close',
  });
  response.end(deniedPage(reason, page));
};

const denySocket = (socket, reason, status = '403 Forbidden') => {
  if (socket.destroyed || socket.writableEnded) return;
  socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\nForbidden: ${reason}\n`);
};

export const createPolicyProxy = (policy = {}) => {
  const downstreamSockets = new Set();
  const upstreamSockets = new Set();
  const pendingWebSocketConnects = new Set();
  const pendingClassifications = new Set();
  let pendingHttpRequests = 0;
  let listening = false;
  let closed = false;
  let listenPromise = null;
  let closePromise = null;

  const track = (collection, socket) => {
    collection.add(socket);
    socket.once('close', () => collection.delete(socket));
    return socket;
  };

  const startClassification = (work, signal) => {
    if (pendingClassifications.size >= MAX_PENDING_CLASSIFICATIONS) return null;
    const slot = {};
    pendingClassifications.add(slot);
    const task = Promise.resolve().then(() => {
      signal?.throwIfAborted();
      return work();
    });
    void task.then(
      () => pendingClassifications.delete(slot),
      () => pendingClassifications.delete(slot),
    );
    return task;
  };
  const classify = (target, signal, classificationPolicy = policy) => startClassification(
    () => classifyProxyTarget(target, { ...classificationPolicy, signal }),
    signal,
  );

  const server = http.createServer((request, response) => {
    if (pendingHttpRequests >= MAX_PENDING_HTTP_REQUESTS) {
      response.writeHead(503, { connection: 'close' });
      response.end();
      return;
    }
    pendingHttpRequests += 1;
    void (async () => {
      let upstream = null;
      let connectTimer = null;
      let classificationTimer = null;
      let downstreamClosed = request.aborted || response.destroyed;
      let admissionReleased = false;
      const classificationController = new AbortController();
      let resolveCancellation;
      const cancellation = new Promise((resolve) => { resolveCancellation = resolve; });
      let classificationCancelled = false;
      const cancelClassification = () => {
        if (classificationCancelled) return;
        classificationCancelled = true;
        classificationController.abort();
        resolveCancellation();
      };
      const releaseAdmission = () => {
        if (admissionReleased) return;
        admissionReleased = true;
        pendingHttpRequests -= 1;
      };
      const closeDownstream = () => {
        if (downstreamClosed) return;
        downstreamClosed = true;
        cancelClassification();
        upstream?.destroy();
        releaseAdmission();
      };
      const clearTimers = () => {
        clearTimeout(classificationTimer);
        clearTimeout(connectTimer);
        classificationTimer = null;
        connectTimer = null;
      };
      const finishWithStatus = (status) => {
        clearTimers();
        if (response.destroyed || response.writableEnded) return;
        if (!response.headersSent) response.writeHead(status, { connection: 'close' });
        response.end();
      };
      const upstreamConnected = () => {
        clearTimeout(connectTimer);
        connectTimer = null;
      };
      request.once('aborted', closeDownstream);
      response.once('close', closeDownstream);
      response.once('finish', releaseAdmission);
      response.once('error', closeDownstream);
      if (downstreamClosed) {
        releaseAdmission();
        return;
      }
      const classificationTask = classify(request.url, classificationController.signal);
      if (!classificationTask) {
        cancelClassification();
        return finishWithStatus(503);
      }
      const classification = classificationTask.then(
        (decision) => ({ decision }),
        (error) => ({ error }),
      );
      const timedOut = new Promise((resolve) => {
        classificationTimer = setTimeout(() => resolve({ timedOut: true }), HTTP_CLASSIFICATION_TIMEOUT_MS);
        classificationTimer.unref?.();
      });
      const outcome = await Promise.race([
        classification,
        cancellation.then(() => ({ cancelled: true })),
        timedOut,
      ]);
      clearTimeout(classificationTimer);
      classificationTimer = null;
      if (outcome.cancelled || downstreamClosed || response.writableEnded) return;
      if (outcome.timedOut) {
        cancelClassification();
        return finishWithStatus(504);
      }
      if (outcome.error) throw outcome.error;
      const decision = outcome.decision;
      await new Promise((resolve) => setImmediate(resolve));
      if (downstreamClosed || response.writableEnded) return;
      if (closed) return denyHttp(response, 'Browser proxy is closed');
      if (!decision.allowed) {
        return denyHttp(response, decision.reason, {
          origin: originOf(request.url),
          grantable: decision.grantable,
          configPath: policy.configPath,
          discoverDevServers: Boolean(policy.devServerGrants),
        });
      }
      if (decision.url.protocol !== 'http:') return denyHttp(response, 'Plain proxy requests must use HTTP');
      const headers = { ...request.headers, host: decision.url.host };
      delete headers['proxy-connection'];
      connectTimer = setTimeout(() => {
        finishWithStatus(504);
        upstream?.destroy();
      }, CONNECT_TIMEOUT_MS);
      connectTimer.unref?.();
      try {
        upstream = http.request({
          hostname: decision.address,
          family: decision.family,
          port: decision.port,
          method: request.method,
          path: `${decision.url.pathname}${decision.url.search}`,
          headers,
          // A supplied agent is only used by deterministic connection-boundary tests.
          agent: policy.httpAgent ?? false,
        }, (upstreamResponse) => {
          upstreamConnected();
          response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
          upstreamResponse.pipe(response);
        });
      } catch (error) {
        clearTimeout(connectTimer);
        connectTimer = null;
        throw error;
      }
      upstream.on('socket', (socket) => {
        track(upstreamSockets, socket);
        if (socket.remoteAddress) upstreamConnected();
        else socket.once('connect', upstreamConnected);
      });
      upstream.on('error', () => {
        upstreamConnected();
        finishWithStatus(502);
      });
      request.pipe(upstream);
    })().catch(() => {
      if (!response.destroyed && !response.writableEnded) denyHttp(response, 'Proxy classification failed');
    });
  });

  server.on('connection', (socket) => {
    track(downstreamSockets, socket);
    socket.on('error', () => socket.destroy());
  });
  server.on('connect', (request, client, head) => {
    let cleanupAfterError = () => client.destroy();
    void (async () => {
      let upstream = null;
      let terminated = false;
      let connectEstablished = false;
      let pendingGate = false;
      let connectTimer = null;
      let handshakeTimer = null;
      let clientHandshakeDataListener = null;
      let clientHandshakeEndListener = null;
      let clientPendingDataListener = null;
      let clientPendingEndListener = null;
      let upstreamHandshakeDataListener = null;
      let upstreamHandshakeEndListener = null;
      const classificationController = new AbortController();
      let resolveCancellation;
      const cancellation = new Promise((resolve) => { resolveCancellation = resolve; });
      let classificationCancelled = false;
      const cancelClassification = () => {
        if (classificationCancelled) return;
        classificationCancelled = true;
        classificationController.abort();
        resolveCancellation();
      };
      const clearTimers = () => {
        clearTimeout(connectTimer);
        clearTimeout(handshakeTimer);
        connectTimer = null;
        handshakeTimer = null;
      };
      const releaseGate = () => {
        if (!pendingGate) return;
        pendingGate = false;
        pendingWebSocketConnects.delete(client);
      };
      const removePendingListeners = () => {
        if (clientHandshakeDataListener) client.removeListener('data', clientHandshakeDataListener);
        if (clientHandshakeEndListener) client.removeListener('end', clientHandshakeEndListener);
        if (clientPendingDataListener) client.removeListener('data', clientPendingDataListener);
        if (clientPendingEndListener) client.removeListener('end', clientPendingEndListener);
        if (upstreamHandshakeDataListener) upstream?.removeListener('data', upstreamHandshakeDataListener);
        if (upstreamHandshakeEndListener) upstream?.removeListener('end', upstreamHandshakeEndListener);
        clientHandshakeDataListener = null;
        clientHandshakeEndListener = null;
        clientPendingDataListener = null;
        clientPendingEndListener = null;
        upstreamHandshakeDataListener = null;
        upstreamHandshakeEndListener = null;
      };
      const cleanupPending = () => {
        clearTimers();
        releaseGate();
        removePendingListeners();
      };
      const isActive = () => !terminated && !client.destroyed && !closed;
      const abort = () => {
        if (terminated) return;
        terminated = true;
        cleanupPending();
        cancelClassification();
        upstream?.destroy();
        if (!client.destroyed) client.destroy();
      };
      const deny = (reason, status = '403 Forbidden') => {
        if (terminated) return;
        terminated = true;
        cleanupPending();
        cancelClassification();
        upstream?.destroy();
        if (connectEstablished || client.destroyed || client.writableEnded) {
          if (!client.destroyed) client.destroy();
        } else {
          denySocket(client, reason, status);
        }
      };
      cleanupAfterError = () => deny('Proxy classification failed');
      client.once('close', () => {
        if (terminated) return;
        terminated = true;
        cleanupPending();
        cancelClassification();
        upstream?.destroy();
      });
      connectTimer = setTimeout(() => deny('Proxy classification or upstream connection timed out', '504 Gateway Timeout'), CONNECT_TIMEOUT_MS);
      connectTimer.unref?.();

      const parsed = parseConnectAuthority(request);
      if (!parsed) return deny('Malformed CONNECT authority or Host header', '400 Bad Request');
      if (closed) return abort();
      let discoveredGrantsPromise = null;
      const connectPolicy = policy.devServerGrants ? {
        ...policy,
        devServerGrants: (signal) => (discoveredGrantsPromise ??= Promise.resolve().then(() => {
          signal?.throwIfAborted();
          return policy.devServerGrants(signal);
        })),
      } : policy;

      const classificationTask = classify(parsed.url, classificationController.signal, connectPolicy);
      if (!classificationTask) return deny('Too many pending proxy classifications', '503 Service Unavailable');
      let outcome = await Promise.race([
        classificationTask.then((decision) => ({ decision }), (error) => ({ error })),
        cancellation.then(() => ({ cancelled: true })),
      ]);
      if (outcome.cancelled || !isActive()) return;
      if (outcome.error) return deny('Proxy classification failed');
      let decision = outcome.decision;
      let websocketOnly = false;
      if (!decision.allowed) {
        if (pendingWebSocketConnects.size >= MAX_PENDING_WEBSOCKET_CONNECTS) {
          return deny('Too many pending WebSocket CONNECT handshakes', '503 Service Unavailable');
        }
        pendingGate = true;
        pendingWebSocketConnects.add(client);
        const wsClassificationTask = classify(`ws://${parsed.authority}/`, classificationController.signal, connectPolicy);
        if (!wsClassificationTask) return deny('Too many pending proxy classifications', '503 Service Unavailable');
        outcome = await Promise.race([
          wsClassificationTask.then((wsDecision) => ({ decision: wsDecision }), (error) => ({ error })),
          cancellation.then(() => ({ cancelled: true })),
        ]);
        if (outcome.cancelled || !isActive()) return;
        if (outcome.error) return deny('Proxy classification failed');
        if (!outcome.decision.allowed) return deny(decision.reason);
        const wsDecision = outcome.decision;
        const grantTask = startClassification(
          () => hasHttpOriginGrant(wsDecision, connectPolicy, classificationController.signal),
          classificationController.signal,
        );
        if (!grantTask) return deny('Too many pending proxy classifications', '503 Service Unavailable');
        outcome = await Promise.race([
          grantTask.then((granted) => ({ granted }), (error) => ({ error })),
          cancellation.then(() => ({ cancelled: true })),
        ]);
        if (outcome.cancelled || !isActive()) return;
        if (outcome.error) return deny('Proxy classification failed');
        if (!outcome.granted) return deny(decision.reason);
        decision = wsDecision;
        websocketOnly = true;
      }

      await new Promise((resolve) => setImmediate(resolve));
      if (!isActive()) return;
      if (websocketOnly) {
        clearTimeout(connectTimer);
        connectTimer = null;
        connectEstablished = true;
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');

        let requestBuffer = Buffer.alloc(0);
        const rejectHandshake = () => abort();
        const beginUpstream = (websocketHandshake, initialClientData) => {
          if (!isActive()) return;
          clearTimeout(handshakeTimer);
          handshakeTimer = null;
          client.removeListener('data', clientHandshakeDataListener);
          client.removeListener('end', clientHandshakeEndListener);
          clientHandshakeDataListener = null;
          clientHandshakeEndListener = null;
          openWebSocketUpstream({
            client,
            decision,
            ...websocketHandshake,
            initialClientData,
            trackSocket: (socket) => track(upstreamSockets, socket),
            isActive,
            releaseGate,
            onFailure: () => abort(),
          });
        };
        const onClientHandshakeData = (chunk) => {
          if (!isActive()) return;
          const scanLength = Math.min(chunk.length, WEBSOCKET_HANDSHAKE_MAX_BYTES + 4 - requestBuffer.length);
          const scanned = chunk.subarray(0, scanLength);
          const candidate = requestBuffer.length > 0 ? Buffer.concat([requestBuffer, scanned]) : scanned;
          const terminator = candidate.indexOf('\r\n\r\n');
          if (terminator < 0) {
            if (malformedHeaderBytes(candidate)
              || requestBuffer.length + chunk.length >= WEBSOCKET_HANDSHAKE_MAX_BYTES
              || scanLength < chunk.length) return rejectHandshake();
            requestBuffer = candidate;
            return;
          }
          const headerLength = terminator + 4;
          const requestHeader = candidate.subarray(0, headerLength);
          if (headerLength > WEBSOCKET_HANDSHAKE_MAX_BYTES
            || malformedHeaderBytes(candidate.subarray(0, terminator))) return rejectHandshake();
          const websocketHandshake = parseWebSocketHandshake(requestHeader, parsed.authority);
          if (!websocketHandshake) return rejectHandshake();
          const initialClientData = [candidate.subarray(headerLength), chunk.subarray(scanLength)];
          if (initialClientData.reduce((total, bytes) => total + bytes.length, 0) > WEBSOCKET_PENDING_DATA_MAX_BYTES) {
            return rejectHandshake();
          }
          beginUpstream(websocketHandshake, initialClientData);
        };
        handshakeTimer = setTimeout(rejectHandshake, WEBSOCKET_HANDSHAKE_TIMEOUT_MS);
        handshakeTimer.unref?.();
        clientHandshakeDataListener = onClientHandshakeData;
        clientHandshakeEndListener = rejectHandshake;
        client.on('data', clientHandshakeDataListener);
        client.once('end', clientHandshakeEndListener);
        if (head?.length > 0) onClientHandshakeData(head);
        return;
      }

      upstream = track(upstreamSockets, net.connect({
        host: decision.address,
        family: decision.family,
        port: decision.port,
      }));
      upstream.once('error', () => deny('Upstream connection failed', '502 Bad Gateway'));
      upstream.once('close', () => {
        if (!terminated) deny('Upstream connection failed', '502 Bad Gateway');
      });
      upstream.once('connect', () => {
        if (!isActive()) return upstream.destroy();
        clearTimeout(connectTimer);
        connectTimer = null;
        connectEstablished = true;
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head?.length > 0) upstream.write(head);
        client.pipe(upstream);
        upstream.pipe(client);
      });
    })().catch(() => cleanupAfterError());
  });

  server.on('upgrade', (request, client, head) => {
    if (pendingWebSocketConnects.size >= MAX_PENDING_WEBSOCKET_CONNECTS) {
      denySocket(client, 'Too many pending WebSocket handshakes', '503 Service Unavailable');
      return;
    }
    let terminated = false;
    let pendingGate = true;
    let classificationTimer = null;
    const classificationController = new AbortController();
    let resolveCancellation;
    const cancellation = new Promise((resolve) => { resolveCancellation = resolve; });
    let classificationCancelled = false;
    const cancelClassification = () => {
      if (classificationCancelled) return;
      classificationCancelled = true;
      classificationController.abort();
      resolveCancellation();
    };
    pendingWebSocketConnects.add(client);
    const releaseGate = () => {
      if (!pendingGate) return;
      pendingGate = false;
      pendingWebSocketConnects.delete(client);
    };
    const cleanup = () => {
      clearTimeout(classificationTimer);
      classificationTimer = null;
      releaseGate();
    };
    const isActive = () => !terminated && !client.destroyed && !closed;
    const deny = (reason, status = '403 Forbidden') => {
      if (terminated) return;
      terminated = true;
      cleanup();
      cancelClassification();
      if (client.destroyed || client.writableEnded || closed) {
        if (!client.destroyed) client.destroy();
      } else {
        denySocket(client, reason, status);
      }
    };
    client.once('close', () => {
      if (terminated) return;
      terminated = true;
      cleanup();
      cancelClassification();
    });
    classificationTimer = setTimeout(() => deny('Proxy classification timed out', '504 Gateway Timeout'), CONNECT_TIMEOUT_MS);
    classificationTimer.unref?.();
    void (async () => {
      let target = request.url;
      try {
        target = new URL(target);
        // HTTP proxy request-targets carry the HTTP URI while Upgrade denotes
        // the WebSocket transport; classify that origin as ws: for policy.
        if (target.protocol === 'http:') target.protocol = 'ws:';
      } catch {
        // The classifier returns the policy's normal invalid-target denial.
      }
      const classificationTask = classify(target, classificationController.signal);
      if (!classificationTask) return deny('Too many pending proxy classifications', '503 Service Unavailable');
      const outcome = await Promise.race([
        classificationTask.then((decision) => ({ decision }), (error) => ({ error })),
        cancellation.then(() => ({ cancelled: true })),
      ]);
      if (outcome.cancelled || !isActive()) return;
      if (outcome.error) return deny('Proxy classification failed');
      const decision = outcome.decision;
      await new Promise((resolve) => setImmediate(resolve));
      if (!isActive()) return;
      clearTimeout(classificationTimer);
      classificationTimer = null;
      if (!decision.allowed) return deny(decision.reason);
      if (decision.url.protocol !== 'ws:') return deny('Plain upgrades must use WebSocket');
      const websocketHandshake = parseDirectWebSocketHandshake(request, decision.url);
      if (!websocketHandshake || head.length > WEBSOCKET_PENDING_DATA_MAX_BYTES) {
        return deny('Malformed WebSocket handshake', '400 Bad Request');
      }
      openWebSocketUpstream({
        client,
        decision,
        ...websocketHandshake,
        initialClientData: head.length > 0 ? [head] : [],
        trackSocket: (socket) => track(upstreamSockets, socket),
        isActive,
        releaseGate,
        onFailure: ({ afterUpgrade }) => {
          if (afterUpgrade) {
            if (!terminated) {
              terminated = true;
              cleanup();
              cancelClassification();
              if (!client.destroyed) client.destroy();
            }
            return;
          }
          deny('Upstream WebSocket handshake failed', '502 Bad Gateway');
        },
      });
    })().catch(() => deny('Proxy classification failed'));
  });

  return {
    get address() {
      const value = server.address();
      return value && typeof value === 'object' ? `127.0.0.1:${value.port}` : null;
    },
    listen() {
      if (closed) return Promise.reject(new Error('Browser proxy is closed'));
      if (listening) return Promise.resolve(this.address);
      if (listenPromise) return listenPromise;
      let onListening;
      let onError;
      const pending = new Promise((resolve, reject) => {
        const cleanup = () => {
          server.removeListener('listening', onListening);
          server.removeListener('error', onError);
        };
        onListening = () => {
          cleanup();
          listening = true;
          if (closed) reject(new Error('Browser proxy is closed'));
          else resolve(this.address);
        };
        onError = (error) => {
          cleanup();
          reject(error);
        };
        server.once('listening', onListening);
        server.once('error', onError);
        try {
          server.listen(0, '127.0.0.1');
        } catch (error) {
          onError(error);
        }
      });
      listenPromise = pending;
      void pending.then(
        () => { if (listenPromise === pending) listenPromise = null; },
        () => { if (listenPromise === pending) listenPromise = null; },
      );
      return pending;
    },
    close() {
      if (closePromise) return closePromise;
      closed = true;
      closePromise = (async () => {
        if (listenPromise) {
          try {
            await listenPromise;
          } catch {
            // A pending listen rejects when shutdown wins the race.
          }
        }
        const serverClosed = server.listening
          ? new Promise((resolve) => server.close(resolve))
          : null;
        for (const socket of downstreamSockets) socket.destroy();
        for (const socket of upstreamSockets) socket.destroy();
        listening = false;
        if (serverClosed) await serverClosed;
      })();
      return closePromise;
    },
  };
};
