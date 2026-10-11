# Visual correction evidence — 2026-10-11

## Latest iteration: chart purpose and technical diagrams

Operator follow-up approves the direction of Mermaid surfaces and asks for a more
technical look, while rejecting a blanket stark-chart treatment. Reference
analysis and source links are in [design.md](design.md). IBM, Carbon and Data Viz
Project were read via web fetch. Uber usage/color pages were read in MCP Chromium.
Salesforce returned a service-error page. Its supplied single-measure example was
analyzed, but no claim is made to have read its full guide.

BarChart and CostChart now compare one measure with a shared solid accent. Removed
per-row swatches and textures. Semantic definition lists retain exact labels and
formatted values. Zero/proportional geometry is unchanged. Stacked and part-to-whole
encodings were not flattened into this comparison rule.

Mermaid global `fontFamily`/`fontSize` now accompany theme variables. Sequence
text measured 16px when only family-specific config was set, because its renderer
copies global fields over those settings. Corrected global config yielded actual
13px text and the exact host font stack. Flow spacing is more compact, with a
branch/decision/merge fixture replacing the two-node example. The engine retains
its orthogonal routing. Its ELK path overrides the curve option with rounded
corners, so the ineffective attempted `linear` override was removed, not claimed
as delivered. Frame strokes are restrained. Mindmap edge normalization is now
family-scoped so authored thick/dashed relations in other families are not flattened.
Pies have separate quiet accent/neutral chart fills and foreground-colored separators.

Latest checks: 59 tests passed, 334 assertions. Package: 118 files. Both generated
examples validated. Documentation: 53 Markdown files, zero failures. Pinned
OpenSpec 1.14.1 strict validation: nine items passed.

MCP Chromium, light/dark captured host themes: weekday bars and cost comparison
screenshots inspected at 1188 × 826. Cost comparison at 320 × 826 had zero canvas
overflow, shared `rgb(76, 157, 243)` fill, no texture, and visible VPS/Home server
labels and €144.00/€204.00 values. All 13 diagram fixtures rendered in both themes.
At 535 × 900, the branching Flow retained 838px intrinsic width in a 469px local
scroll region, without whole-canvas horizontal overflow. Sequence text was 13px.
Mindmap edges were 1.5px. Technical flow/sequence/class and pie light screenshots,
plus narrow dark mindmap/timeline, were inspected.

Actual resolved CSS color samples were painted to a canvas pixel and compared
using sRGB relative luminance. These are scoped contrast results, not a general
WCAG or screen-reader certification:

| Sample | Light ratio | Dark ratio |
| --- | --- | --- |
| Comparison bar against elevated card | 5.23:1 | 5.56:1 |
| Row label against elevated card | 5.46:1 | 5.59:1 |
| Numeric value against elevated card | 7.99:1 | 8.19:1 |
| Pie foreground label/separator against five chart fills, minimum | 4.92:1 | 4.61:1 |

Simple comparison values remain semantic text with decorative tracks hidden from
assistive technology. Screen-reader operation was not executed. Mermaid relationship
descriptions still depend on authored `accTitle`/`accDescr`. This pass does not
certify every chart family, dense categorical legend or arbitrary host theme.
The reusable reading-task lesson was added to
`/home/core/agents/skills/design/references/accessibility.md`. Project technical
styling/preferences remain in the Canvas README and this change, not a global rule.

## First iteration

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
