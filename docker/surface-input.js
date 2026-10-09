// Only coalesce queued scrolling at one point with unchanged modifiers and
// direction. Clicks, keys, moves, reversals and view/handoff changes are barriers.
export const mergeWheelBatches = (previous, incoming) => {
  const events = [...previous, ...incoming];
  const first = events[0];
  if (!first || events.some((event) => event.type !== 'wheel'
    || event.x !== first.x || event.y !== first.y
    || ['alt', 'ctrl', 'meta', 'shift'].some((key) => event.modifiers[key] !== first.modifiers[key]))) return null;
  const sameDirection = (axis) => new Set(events.map((event) => Math.sign(event[axis])).filter(Boolean)).size <= 1;
  if (!sameDirection('deltaX') || !sameDirection('deltaY')) return null;
  const deltaX = events.reduce((sum, event) => sum + event.deltaX, 0);
  const deltaY = events.reduce((sum, event) => sum + event.deltaY, 0);
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return null;
  return [{ ...first, deltaX, deltaY }];
};
