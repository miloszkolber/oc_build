// Adapted from OpenChamber's server browser inspector (MIT).

const REDACTED = '[REDACTED]';
export const isSensitiveName = (name) => /auth|cookie|password|passwd|secret|token|credential|apikey|accesskey|privatekey|sessionid|signature|csrf|xsrf|^key$|^code$/i
  .test(String(name).replace(/[^a-z0-9]/gi, ''));

const boundedString = (value, maxChars, fallback = '') => {
  try {
    return String.prototype.valueOf.call(value).slice(0, maxChars);
  } catch {
    return fallback;
  }
};

export const redactUrl = (value, maxChars = 2048) => {
  const source = boundedString(value, Infinity).trim().replace(/[\t\n\r]/g, '');
  if (!source) return '';
  try {
    const absolute = URL.canParse(source);
    const url = new URL(source, 'https://inspector.invalid');
    if (!url.host && !['file:', 'about:'].includes(url.protocol)) return `${url.protocol}[redacted]`.slice(0, maxChars);
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveName(key)) url.searchParams.set(key, REDACTED);
    }
    if (url.hash.includes('=')) {
      const hash = url.hash.slice(1);
      const queryStart = hash.indexOf('?') + 1;
      const params = new URLSearchParams(hash.slice(queryStart));
      for (const key of [...params.keys()]) if (isSensitiveName(key)) params.set(key, REDACTED);
      url.hash = hash.slice(0, queryStart) + params.toString();
    }
    const result = absolute ? url.href : /^[/\\]{2}/.test(source)
      ? url.href.slice(url.protocol.length) : source.split(/[?#]/, 1)[0] + url.search + url.hash;
    return result.slice(0, maxChars);
  } catch {
    return '[Invalid URL]'.slice(0, maxChars);
  }
};

const redactTextUrls = (text) => text.replace(/\b(?:https?|wss?|file):\/\/[^\s<>"']+/gi, (url) => redactUrl(url));

const redactSensitiveAssignment = (assignment, quote, name, separator) => {
  if (!isSensitiveName(name)) return assignment;
  const prefix = `${quote}${name}${quote}${separator}`;
  const value = assignment.slice(prefix.length);
  const replacement = value.startsWith('"') ? '"[REDACTED]"'
    : value.startsWith("'") ? "'[REDACTED]'" : '[REDACTED]';
  return `${prefix}${replacement}`;
};

const redactSensitiveAssignments = (text) => {
  const assigned = text.replace(
    /(["']?)([a-z][a-z\d_.-]*)\1(\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?:bearer|basic)\s+[^\s,;}&\]]+|[^\s,;}&\]]+)/gi,
    redactSensitiveAssignment,
  );
  const pair = /(["']?)([a-z][a-z\d_.-]*)\1(\s+)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|(?:bearer|basic)\s+[^\s,;}&\]]+|[^\s,;}&\]]+)/gi;
  let output = '';
  let cursor = 0;
  let searchFrom = 0;
  // Skip ordinary word pairs without consuming them so a later sensitive key is still found.
  while (searchFrom < assigned.length) {
    pair.lastIndex = searchFrom;
    const match = pair.exec(assigned);
    if (!match) break;
    if (!isSensitiveName(match[2])) {
      searchFrom = match.index + `${match[1]}${match[2]}${match[1]}${match[3]}`.length;
      continue;
    }
    output += assigned.slice(cursor, match.index);
    output += redactSensitiveAssignment(match[0], match[1], match[2], match[3]);
    cursor = pair.lastIndex;
    searchFrom = cursor;
  }
  return output + assigned.slice(cursor);
};

export const redactText = (value) => redactTextUrls(redactSensitiveAssignments(boundedString(value, Infinity)));

export const formatRemoteObject = (remoteObject, maxChars = 4000) => {
  const remote = remoteObject ?? {};
  let text = boundedString(remote.description, maxChars + 1, 'undefined');
  let truncated = false;
  if (remote.type === 'string') text = boundedString(remote.value, maxChars + 1, text);
  else if (remote.type === 'undefined') text = 'undefined';
  else if (remote.type === 'boolean') text = remote.value === true ? 'true' : 'false';
  else if (remote.type === 'number' || remote.type === 'bigint') {
    text = boundedString(remote.unserializableValue, maxChars + 1, Number.isFinite(remote.value) ? String(remote.value) : text);
  } else if (remote.subtype === 'null') text = 'null';
  else if (Array.isArray(remote.preview?.properties)) {
    const properties = remote.preview.properties.slice(0, 10).map((property) => {
      const name = boundedString(property?.name, 128);
      const value = isSensitiveName(boundedString(property?.name, Infinity))
        ? REDACTED
        : boundedString(property?.value, maxChars + 1, boundedString(property?.type, 64, 'object'));
      return `${name}: ${property?.type === 'string' && value !== REDACTED ? JSON.stringify(value) : value}`;
    });
    truncated = remote.preview.overflow === true || remote.preview.properties.length > 10;
    text = `${remote.subtype === 'array' ? '[' : '{'}${properties.join(', ')}${remote.subtype === 'array' ? ']' : '}'}`;
  }
  truncated ||= text.length > maxChars;
  text = redactText(text);
  return { text: text.slice(0, maxChars), truncated: truncated || text.length > maxChars };
};

