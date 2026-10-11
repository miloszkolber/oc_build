# Visual correction evidence — 2026-10-11

## Delivered

Shared Canvas renderer/CSS corrections, prompted by operator annotations:
metric trend in the top-right header, 24px/700 heading (21px narrow), uniform
callout border, monochrome rating/choice/checklist/step/timeline marks. Semantic
status badges and authored warning/success meanings retain their colors.

The first five chart fills are solid. Subsequent five-fill groups use the next
pattern, keeping 30 unique automatic pairs and matching legends. Pattern ink is
quieter. This removes the dominant dotted texture in the token-composition example.

Mermaid drawings keep intrinsic width rather than enlarging to a wide card.
Node/category faces use neutral foreground/surface mixtures. Mindmap branches
are thin and neutral, root and labels are neutral, and classic node underlines
are removed. Timeline title and axis are restrained. Pie labels/strokes are
smaller. Quadrant is 360px square, XY is 520 × 280 and its background matches
the enclosing elevated surface rather than a different page background.

## Checks

All commands ran through the sandbox. `bun test`: 56 passed, 320 assertions.
Package build: 118 files. Both generated examples validated via
`bun scripts/validate.mjs dist/examples/<name>.canvas.json`.
Preview rebuilt with the unchanged approved conversation artifact and production
panel. No preview-only component styling was added.
Documentation check: 52 Markdown files, zero failures. Pinned OpenSpec 1.14.1
strict validation: nine items passed. `git diff --check` passed.
Final packaged conversation iframe: two diagrams ready, zero writes, zero
whole-canvas horizontal overflow, heading 24px. Authored JSON SHA-256 remained
`86847c6e26c2e346164188223600d3c3b0b26777cf8438749337af94fccddf64`.

MCP Chromium at `http://127.0.0.1:8805/`, 1188 × 826, 535 × 900 and 320 × 826:
inspected the gallery heading/metric/header and monochrome controls in light/dark.
Verified uniform 1px callout edges. Inspected six-series marks at 320px: first five
solid, sixth diagonal, matching legend. Boundaries and states had zero whole-canvas
horizontal overflow. Unit checks cover all 30 allowed automatic pairs and preserved
zero/fraction geometry. All 13 diagram fixtures rendered in light/dark with no
whole-canvas overflow. Inspected affected pie, quadrant, mindmap, timeline and XY,
plus flow, sequence, class, state, entity, requirement and git neighbors. At 535px,
wide diagram content remained locally scrollable with its intrinsic text size.

A trial 640px Gantt default compressed date ticks until they overlapped. Removed
that trial instead of claiming success. Gantt retains Mermaid's intrinsic width
and local scrolling. Timeline still uses the library's event layout, including
space around its axis. This change does not substitute a different chart type.

## Limits

The annotated in-app forwarding URL's port 58832 is not reachable through host
loopback here. Review evidence is MCP Chromium, not direct in-app verification.
Native installed Canvas remains the prior 0.9.15 build. The regenerated same-version
ZIP is a development artifact, not a new release or installed upgrade.
No authored files, live extension, host services or authority grants were changed.
Native/operator acceptance and release installation remain open. Do not archive
this change as accepted before review.
