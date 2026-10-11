# Gap-closure evidence

## Confirmed findings and repairs

The previous half-star branch covered only fractions from 0.25 to less than
0.75. Values 2.2 and 4.9 therefore displayed no partial star. The overlay now
clips to the actual fraction, including values near zero and one.

The previous dense modifier applied equally to every index above four. Indices
5 and 10 therefore both used the same fill and vertical-bar mark. Six patterns
against five automatic fills have a 30-entry pair cycle. Regression tests check
all allowed donut entries, all 12 composition segments and all eight stacked
series. Explicit semantic tone overrides remain the author's status choices.

## Runtime and visual checks

Verified in MCP Chromium, not the native desktop client. Tab
`FFC7DDA514CECF1DB69A973081B36A94` used the synthetic host on port 8805.

Production States fixture inspected at 1280 × 900 and 390 × 900 in light/dark.
The 12-segment and eight-series legends and marks fit their surfaces. The
30-entry donut retains all labels and exact numeric values. Dense small slices
are inherently hard to identify visually, so no claim of 30 perceptually unique
textures is made. Its automatic fill/pattern pairs are structurally unique.
All four theme/width cases measured zero page and canvas horizontal overflow,
30 unique pairs, zero missing SVG pattern references and zero synthetic writes.

Measured fractional clip widths: 50%, 10%, 20%, 75% and 90%, corresponding to
2.5, 0.1, 2.2, 2.75 and 4.9. The nested glyph stays 16px wide.

## Mermaid fault injection

Built with `bun scripts/preview.mjs --build-only --fault-injection`, opened
`/panel-review.html?faults`, and rendered Gallery to initialize `diagramProbe`.
Then mounted one or two flowcharts using disposable synthetic content.

| Injection | Observable result |
| --- | --- |
| One `svg element not in render tree` | Calls A, B, A. Both SVGs ready. No terminal error. |
| Two consecutive transient failures on A | Exactly two calls. Terminal error displayed. |
| Permanent parse failure | Exactly one call. Terminal error displayed. |
| Held A, switch session, then release with transient failure | Calls old A, new A, new B. Old queued B cancelled before Mermaid. No stale retry or stale error. |

For cancellation, the replacement synthetic read was delayed 800ms and release
occurred only after the old canvas unmounted. An earlier immediate-release probe
did not establish that boundary and is not cancellation evidence. Maximum active
Mermaid calls was one throughout. Final active count was zero. Writes were zero.

The adapter is review-only and calls real Mermaid for successful attempts.
This closes the previously source-only retry gap without production test hooks.

## Checks and acceptance

Commands run through `sandbox run --` in `extensions/canvas`:
`bun test test`, `bun run package`, and preview build with production and fault
flags. Tests: 55 passed, 316 assertions. ZIP: 0.9.15, 118 files.

Native desktop version, host fonts/themes, composer insertion and operator
sign-off cannot be established with the advertised standalone Chromium tools.
They remain explicitly unchecked in the existing native acceptance ledger.

Installed 0.9.15 with all nine packaged entries recursively equal to `dist`.
Manifest authority is unchanged. Backup: `generative-canvas-0.9.14-final`.
ZIP SHA-256: `3109274ce10b744b64cbbfa2b3396d64c744d6cf82be7a8c8ee484771ccd83f7`.
Main bundle SHA-256: `642db3866fbfbb9b7162899333c40db3ba9fc26044fc016076c29840d0c2d48e`.
`diagramProbe` is absent from production panel files. No host restart or canvas
file modification was performed.

Durable review lesson applied to the shared owner:
`/home/core/agents/skills/design/references/review.md` now asks renderer reviews
to check fractional extremes and wrap boundaries through validated limits.
This addresses insufficient test-data coverage, not a new aesthetic rule.

Final pre-archive checks: `bun scripts/check-docs.mjs` checked 47 Markdown files,
zero failures. Pinned OpenSpec 1.14.1 strict validation passed all nine items.
`git diff --check` was clean. Both shipped examples validated.

Normal OpenSpec archive applied the requirement delta to the main spec. The
post-archive documentation check again passed 47 files and strict validation
passed eight remaining items. Native acceptance was not archived.

Final production Gallery smoke check: two diagram SVGs ready, zero canvas
horizontal overflow, no `diagramProbe` global, zero file-write requests and no
console messages. Inspected the diagram/cost-control region in dark theme.
