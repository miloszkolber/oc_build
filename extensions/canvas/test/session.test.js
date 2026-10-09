import { test, expect } from 'bun:test';
import { CANVAS_ROOT, hashSessionId, isSafeSessionId, sessionFile } from '../src/session.js';

test('safe session ids map directly to their canvas file', () => {
  expect(sessionFile('6746b234-b722-49a9-be0a-610aedd3a6c0')).toBe(`${CANVAS_ROOT}/6746b234-b722-49a9-be0a-610aedd3a6c0.canvas.json`);
  expect(isSafeSessionId('abc_123-XYZ.9')).toBe(true);
});

test('unsafe session ids use a stable hashed filename without traversal', () => {
  const first = sessionFile('../../etc/passwd');
  const second = sessionFile('../../etc/passwd');
  expect(first).toBe(second);
  expect(first.startsWith(`${CANVAS_ROOT}/session-`)).toBe(true);
  expect(first.endsWith('.canvas.json')).toBe(true);
  expect(first).not.toContain('..');
  expect(sessionFile('a/b')).not.toBe(sessionFile('a\\b'));
});

test('hashing is deterministic across calls', () => {
  expect(hashSessionId('session-α')).toBe(hashSessionId('session-α'));
  expect(hashSessionId('one')).not.toBe(hashSessionId('two'));
});

test('missing or empty sessions are rejected instead of resolving a shared file', () => {
  for (const value of [null, undefined, '', 42]) expect(() => sessionFile(value)).toThrow('conversation');
});
