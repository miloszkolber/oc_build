import assert from 'node:assert/strict';
import test from 'node:test';
import { createSurface } from '../src/surface.js';

const fixture = () => {
  let listener;
  const calls = [];
  const page = { sessionId: 'page', cdp: {
    isOpen: true,
    onEvent(fn) { listener = fn; return () => { listener = null; }; },
    async sendSession(_id, method) { calls.push(method); },
  } };
  const surface = createSurface({ ensurePage: async () => page, title: 'Fixture', viewport: { width: 800, height: 600 }, viewportState: { mode: 'auto' } });
  const paint = (text) => listener({ sessionId: 'page', method: 'Page.screencastFrame', params: {
    sessionId: 1, data: Buffer.from(text).toString('base64'), metadata: { deviceWidth: 800, deviceHeight: 600 },
  } });
  return { surface, paint, calls };
};

test('coalesces compositor bursts while delivering the final static paint', async () => {
  const { surface, paint, calls } = fixture();
  try {
    await surface.frame({ after: 0, wait: 0 });
    paint('initial');
    const initial = await surface.frame({ after: 0, wait: 0 });
    assert.equal(initial.browserViewportMode, 'auto');
    for (let i = 0; i < 20; i++) paint(`paint-${i}`);
    const final = await surface.frame({ after: initial.sequence, wait: 1000 });
    assert.equal(final.bytes.toString(), 'paint-19');
    assert.equal(calls.filter(m => m === 'Page.screencastFrameAck').length, 21);
  } finally { await surface.close(); }
});

test('retarget cancels a pending old-tab paint', async () => {
  const { surface, paint } = fixture();
  try {
    await surface.frame({ after: 0, wait: 0 });
    paint('initial');
    await surface.frame({ after: 0, wait: 0 });
    paint('old tab trailing paint');
    surface.retarget();
    assert.equal(await surface.frame({ after: 0, wait: 100 }), null);
  } finally { await surface.close(); }
});

test('panel resizing restarts the screencast with the current encoding cap', async () => {
  let cap = { maxWidth: 600, maxHeight: 400 };
  const starts = [];
  const page = { sessionId: 'page', cdp: {
    isOpen: true,
    onEvent() { return () => {}; },
    async sendSession(_id, method, params) { if (method === 'Page.startScreencast') starts.push(params); },
  } };
  const surface = createSurface({
    ensurePage: async () => page, viewport: { width: 1440, height: 900 },
    streamSize: () => cap,
    setPanelSize: async ({ width, height }) => { cap = { maxWidth: width, maxHeight: height }; return { width: 1440, height: 900 }; },
  });
  try {
    await surface.frame({ after: 0, wait: 0 });
    await surface.resize({ width: 800, height: 500 });
    await surface.frame({ after: 0, wait: 0 });
    assert.deepEqual(starts.map(({ maxWidth, maxHeight }) => ({ maxWidth, maxHeight })), [
      { maxWidth: 600, maxHeight: 400 }, { maxWidth: 800, maxHeight: 500 },
    ]);
  } finally { await surface.close(); }
});
