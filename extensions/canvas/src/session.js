export const CANVAS_ROOT = '/data/.db/openchamber/canvas';

// Session ids are host-controlled and normally safe segments (for example
// UUIDs). Anything unusual falls back to a deterministic hash so the panel
// and agents always derive the same filename without traversal risk.
export function isSafeSessionId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,120}$/.test(value);
}

export function hashSessionId(value) {
  let high = 0x811c9dc5, low = 0x811c9dc5;
  const text = String(value);
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    high = Math.imul(high ^ code, 0x01000193) >>> 0;
    low = Math.imul(low ^ (code + 31), 0x01000193) >>> 0;
  }
  return (high.toString(16).padStart(8, '0') + low.toString(16).padStart(8, '0'));
}

export function sessionFile(sessionId) {
  if (typeof sessionId !== 'string' || sessionId.length === 0) throw new Error('A conversation must be selected');
  const leaf = isSafeSessionId(sessionId) ? `${sessionId}.canvas.json` : `session-${hashSessionId(sessionId)}.canvas.json`;
  return `${CANVAS_ROOT}/${leaf}`;
}
