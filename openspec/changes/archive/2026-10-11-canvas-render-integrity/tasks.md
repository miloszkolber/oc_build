# Tasks

## 1. Diagram resilience

- [x] 1.1 Reproduce the reported `svg element not in render tree` failure against
  current source, driving the exact trigger (render attempt while the guest document
  is not rendered) and record the before state in `evidence.md`.
- [x] 1.2 Gate `Diagram` rendering on a document-rendered probe and defer with a
  bounded wait until the document renders. Verified by a render that starts hidden
  and completes when shown.
- [x] 1.3 Retry once on a render-tree failure instead of latching a terminal error.
  Verified by the same hidden-then-shown sequence producing two rendered diagrams
  and no error text.
- [x] 1.4 Keep genuine failures visible with their reason, and keep the SSR markup
  (`Rendering diagram…`, `aria-busy`) unchanged. Verified by unit test.

## 2. Redundant series encoding

- [x] 2.1 Define the `pat-1`…`pat-5` pattern set from host tokens, with ink that
  contrasts on light and dark fills, and confirm the single-hue ramp stays.
- [x] 2.2 Apply patterns to bar fills, composition segments, stacked columns and
  legend chips; verify adjacent series are distinguishable without relying on hue.
- [x] 2.3 Render the donut as an SVG ring with per-slice pattern fills and hairline
  separation; verify values and totals are unchanged and the legend maps to slices.
- [x] 2.4 Unit-test that multi-series output carries pattern classes/patterns and
  that single-series charts stay solid.

## 3. Scroll stability

- [x] 3.1 Hide scrollbars on `.canvas`, `.table-scroll`, `.diagram-host` and
  `.code-block` while keeping overflow scrolling, and verify no gutter shifts
  content when a scrollbar would appear.

## 4. Preview parity and focus ownership

- [x] 4.1 Remove the preview font pins so preview and panel resolve one token chain;
  verify the served preview renders the same face as the panel in both themes.
- [x] 4.2 Let the table search field wrapper own focus; verify a focused filter input
  shows a single ring.

## 5. Release and spec sync

- [x] 5.1 Run `bun test`, the example validator and `bun run package`.
- [x] 5.2 Update `extensions/canvas/README.md` and `VERIFICATION.md` with the
  behavior and evidence.
- [x] 5.3 Sync the delta into the main canvas-panel spec, validate, then archive with
  `--skip-specs`.