# Canvas render integrity

## Why

Operator review of the installed panel and the served preview found four defects
that make the canvas look broken or unreliable rather than native:

1. **Diagrams latch a fatal error.** Reproduced against the current source: when a
   render attempt starts while the guest document is not rendered (collapsed panel,
   hidden tab, conversation switch), Mermaid measures its temporary node with no
   layout box and rejects with `svg element not in render tree`. The panel stores
   that rejection as terminal state, so the diagram stays broken after the panel
   becomes visible again. Both diagrams in one canvas failed this way in review.
2. **Series are distinguished by color alone.** A single-hue ramp leaves adjacent
   slices nearly identical, most visibly in the traffic donut (48% vs 35% read as
   the same blue). Chart series carry no second, non-color channel.
3. **Scrollable regions reserve a gutter.** The canvas, tables, code and diagram
   hosts draw 8px scrollbars, so appearing/disappearing scrollbars shift content.
4. **Preview and panel diverge.** The preview pins `--oc-font: Arial, sans-serif`
   while the panel resolves `var(--oc-font, var(--font-sans, ui-sans-serif,
   system-ui, sans-serif))`, so the review surface renders in a different face
   from the product. The table search field also paints a focus ring on both the
   input and the field wrapper.

## What Changes

- `Diagram` defers rendering until the guest document is rendered and retries one
  transient Mermaid measurement failure instead of latching an error.
- Multi-series charts encode series with a repeating pattern as well as a fill;
  legends repeat the pattern; `DonutChart` becomes an SVG ring with per-slice
  patterns and slice separation; single-series charts stay solid.
- Panel scroll containers hide scrollbars, so overflow never reserves a gutter.
- The table filter wrapper owns the focus indicator; the preview drops its font
  pin so it resolves the panel's token chain.
- Deltas: `specs/canvas-panel/spec.md` MODIFIES "Host-derived visual presentation"
  with the diagram-visibility, redundant-encoding, scroll-stability, preview-parity
  and focus-ownership scenarios.

## Scope

One capability: **Canvas panel** ([specs/canvas-panel](../../../specs/canvas-panel/spec.md)).
Renderer, panel stylesheet and the served preview only. No catalog, schema, bundle,
service, permission or host change. Keeps `cat >` free of new dependencies and
adds no component.

Deliberately excluded: native desktop acceptance (owned by
[accept-canvas-panel-on-desktop](../../accept-canvas-panel-on-desktop/proposal.md)),
agent sandbox work (owned by artful-yak), and any redesign. The 0.9.12 visual
system is retained; this change fixes resilience, redundant encoding, scroll
stability and preview parity within it.

## Approach

- **Diagram resilience.** Gate the render attempt on `documentIsRendered()`
  (`visibilityState` plus a layout probe), wait for the document to render with a
  bounded `requestAnimationFrame` poll plus `visibilitychange`/`resize`, and retry
  once when Mermaid reports a render-tree failure. A genuine failure still
  reports its reason instead of the panel going blank.
- **Redundant encoding.** Pair every series with a repeating pattern
  (`pat-1`…`pat-5`: solid, diagonal, dots, crosshatch, grid) drawn from `--bg`
  so the ink contrasts on light and dark fills. Bars, the composition bar, stacked
  columns and legend chips carry the pattern; the donut moves from a
  `conic-gradient` to an SVG ring so slices can be patterned and separated.
- **Scroll stability.** Hide scrollbars on the panel's scroll containers instead of
  reserving an 8px gutter.
- **Preview parity.** Drop the preview's font pins so both surfaces resolve the same
  token chain, and let the field wrapper own the table-search focus ring.

## Verification and status

Source review, `bun test`, example validation, packaging and MCP Chromium render
evidence in [evidence.md](evidence.md), which separates executed checks from
reviewer-reported observations. Browser MCP evidence is not native desktop
acceptance.
