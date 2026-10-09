import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeWheelBatches } from './surface-input.js';
const wheel = (deltaY = 10, extra = {}) => ({ type: 'wheel', x: 100, y: 100, deltaX: 0, deltaY, modifiers: { alt: false, ctrl: false, meta: false, shift: false }, ...extra });
test('coalesces a queued wheel burst without losing scroll distance', () => {
  let batch = [wheel()];
  for (let i = 0; i < 59; i++) batch = mergeWheelBatches(batch, [wheel()]);
  assert.equal(batch.length, 1);
  assert.equal(batch[0].deltaY, 600);
});
test('keys, clicks, moves, modifiers, target and direction changes are barriers', () => {
  for (const event of [{ type: 'key' }, { type: 'pointer' }, wheel(-10), wheel(10, { x: 101 }), wheel(10, { modifiers: { ctrl: true } })]) {
    assert.equal(mergeWheelBatches([wheel()], [event]), null);
  }
});
