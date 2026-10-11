import { test, expect } from 'bun:test';
import { waitForRenderedDocument } from '../src/diagram-visibility.js';

test('diagram wait gates layout and visibility, then releases its listeners', async () => {
  const previous = globalThis.document;
  let rendered = false;
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  doc.body = { getClientRects: () => rendered ? [{}] : [] };
  const listeners = new Set();
  const add = doc.addEventListener.bind(doc), remove = doc.removeEventListener.bind(doc);
  doc.addEventListener = (type, callback) => { listeners.add(callback); add(type, callback); };
  doc.removeEventListener = (type, callback) => { listeners.delete(callback); remove(type, callback); };
  globalThis.document = doc;
  const controller = new AbortController();
  try {
    let complete = false;
    const waiting = waitForRenderedDocument(controller.signal).then(() => { complete = true; });
    await Promise.resolve();
    expect(complete).toBe(false);
    rendered = true;
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    await Promise.resolve();
    expect(complete).toBe(false);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    await waiting;
    expect(complete).toBe(true);
    expect(listeners.size).toBe(0);
  } finally { controller.abort(); globalThis.document = previous; }
});

test('cancelled hidden diagram rejects promptly and does not block later work', async () => {
  const previous = globalThis.document;
  const doc = new EventTarget();
  doc.visibilityState = 'hidden';
  doc.body = { getClientRects: () => [] };
  globalThis.document = doc;
  try {
    const controller = new AbortController();
    const waiting = waitForRenderedDocument(controller.signal);
    controller.abort();
    await expect(waiting).rejects.toHaveProperty('name', 'AbortError');
    await expect(waitForRenderedDocument(controller.signal)).rejects.toHaveProperty('name', 'AbortError');
  } finally { globalThis.document = previous; }
});
