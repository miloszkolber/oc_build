# Evidence

## Baseline

Source 9d5f865 / Canvas 0.9.13. MCP Chromium review tab
`0883DAB06567D119E334CCA682919AE2`, preview at `http://127.0.0.1:8800/`.
1280 × 900, light. Inspected six successive scroll positions covering the gallery.
640 × 900 narrow preview inspected before edits.

- Preview body visibly monospace. Per-glyph probes: `system-ui` W/i both 12.002px
  at 20px, `sans-serif` 18.877/4.443px. Current browser container image is
  sha256:ae12b03d7a50bf90cdfddeab536d39fd1f5829cee0b871385f9d4c9ea7b4696b,
  not evidence that the historical local font repair is still deployed.
- Failed badge visually neutral. Computed `--error` and `--error-text` empty due
  self-referencing fallbacks with no supplied error fixture tokens.
- Narrow preview retains a 250px inventory rail. Grid breakpoints use viewport
  rather than panel width and pack two cards into roughly 170px tracks.
- Source: successful refresh always resets months to the authored initial value.
- Source: donut zero/tiny slices advance by a fixed gap even when their length
  is zero. Stacked marks force nonzero minimum sizes for zero values.
- Source: Mermaid color resolver also resolves font strings as colors.

## Limits

The standalone browser is not the native desktop client. Synthetic host fixtures
will exercise the shipped entrypoint but do not establish real-host acceptance.
Previous archival evidence is historical and is not rewritten as newly executed checks.

## Implemented review

Canvas 0.9.14 preserves the existing 39-component vocabulary and surfaces. The
preview now has SDK theme fixtures, boundary data, 13 diagram families and an
actual-panel synthetic host. Review fixtures do not ship in the ZIP.

MCP Chromium tab above, `http://127.0.0.1:8805/` and
`http://127.0.0.1:8805/panel-review.html?production`. Viewports 1280 × 900 and
390 × 900. Successive overlapping screenshots covered the gallery in both themes,
long/zero/tiny/single data, and 13 Mermaid families. Final screenshots checked the
production bundle with the same SDK fixtures. The native desktop was not checked.

Confirmed repairs: cyclic error/accent token fallbacks, generic fallback font
resolution, container-width grid collapse, label overflow, table numeric wrapping,
zero stacked marks, proportional donut boundaries and centered one-point charts.
Wide content receives focusable local scroll regions. Mermaid fonts bypass color
parsing. Default shadows, inverted timeline colors, timeline brightening and weak
chart/point colors no longer override the host-derived presentation.

## Second review pass

A new `States` fixture exercised optional props and boundary numbers the gallery
never shows: omitted metric detail and change, zero and above-maximum progress, a
zero maximum, empty and above-maximum gauges, fractional and zero ratings, all-zero
and constant heatmaps, unselected and multiple-mode choices, a person without a
role, an unlabelled divider, a callout without a title, 12 and 64px icons, a
timeline without timestamps, a table footer with alignment and signed numbers,
single-segment and six-segment composition, six-series stacking, zero values among
bars, flat series, a one-point scatter, right-aligned caption text, a bulleted list
and a code block without a language. Probing the static renderer confirmed the
values in the report below.

Four defects were confirmed and repaired:

- **Empty gauge painted a dot.** `stroke-dasharray="0.0 276.5"` with
  `stroke-linecap: round` still renders a cap. The ring is now omitted at zero.
  An above-maximum value still clamps to a full ring and states the real number.
- **Fractional rating overstated.** 2.5 of 5 rounded to three filled stars. It now
  draws two full stars and a half-star overlay for fractions from 0.25 to 0.75.
- **Zero maximum paired a value with `0%`.** 5 against a maximum of 0 has no share
  to report, so the percentage is omitted and the value stands alone.
- **The ramp repeated at six.** The pattern cycle was five, so the sixth series
  received the first series' fill and pattern even though the catalog allows 12
  segments and 8 series. Wrapped series now take a denser repeat of the same
  shape. The solid step needed its own dense form, otherwise index five still
  matched index zero; `.pat-1.dense` draws vertical bars and the donut gained a
  matching `solid-dense` SVG pattern.

Verified in MCP Chromium after the change: at 2.4× zoom the six donut slices are
solid, diagonal, dots, crosshatch, grid and vertical bars, and the sixth legend
chip matches its slice. The six-segment, six-series and six-row bar charts show the
same six distinct marks at 1280 × 900 and 390 × 900 in both themes.

State-fixture contrast through the synthetic host and the production bundle:
158 visible HTML text elements per theme, minimum 5.22:1 light and 6.95:1 dark,
none below 4.5. Same sampling method and exclusions as the gallery figures.

Six new renderer tests cover the empty and above-maximum gauge, the fractional and
zero rating, the zero and over maximum progress, wrapped patterns in stacked bars,
stacked columns and the donut, and numeric footer cells. 54 tests pass, 302
assertions. Both examples validate and the ZIP is still 118 files.

## Runtime checks

- Unchanged polling retained table filter `worker`, ascending latency sort,
  Details tab and expanded disclosure. Two diagrams remained rendered.
- Chosen 36-month horizon survived two polls and compatible authored updates.
  Removing 36 from the options reset to the new authored 24-month default.
- Synthetic workspace snapshots resolved `review-child` to
  `/review-session.canvas.json`. Initial probe omitted SDK `state` metadata and
  exercised fallback, not ancestry. The corrected snapshot explicitly returned
  `state: ready` for projects and sessions and verified the ancestor path.
- A delayed Gallery read for the old selection did not replace Cost explorer for
  `fresh-new-2`. Repeated-session resolution now checks generation as well as ID.
- Explicitly hidden document: body rects 0, pending 2, SVG 0 after 500ms. Showing
  it: pending 0, SVG 2. Hidden cancellation followed by new Gallery: SVG 2.
  The earlier immediate iframe-hide probe observed stale layout and is not the
  deferral evidence. The retry branch remains source-reviewed, not fault-injected.
- Invalid/read-error notices preserved the prior canvas and its measured card
  rectangle. Connecting/no-conversation/first-load invalid were inspected visually.
- Synthetic copy included the resolved path. Compose requested append, without
  submit. All synthetic interactions recorded zero file writes.
- Horizon-label x/y/width/height arrays were byte-identical after settled React
  updates. Focused table ArrowRight moved scrollLeft from 0 to 40px.
- Final production gallery text contrast: 203 visible HTML text elements per
  theme, min 4.56:1 light / 6.11:1 dark, zero below 4.5. RGBA colors were sampled
  with a 1px Canvas2D probe, ancestor backgrounds alpha-composited, WCAG luminance
  calculated. Waited for theme updates to settle. SVG/gradient/disabled-state and
  real-host contrast are excluded. Broad AA compliance is not claimed.

## Executed tooling

All development commands used `sandbox run --` from extensions/canvas:

```sh
bun test test
bun run package
bun scripts/validate.mjs dist/examples/gallery.canvas.json
bun scripts/validate.mjs dist/examples/cost-explorer.canvas.json
bun scripts/preview.mjs --build-only --production-panel
```

48 tests passed, 285 assertions. Both examples validated. ZIP 0.9.14: 118 files.
No dependencies added. Browser font deployment is a separate owner and was not
changed. The live browser still did not prove the previous local font-image repair.

## Installed result

`/data/.db/openchamber/extensions/generative-canvas` was 0.9.13 before this step.
It was copied to
`/data/.db/openchamber/extension-backups/generative-canvas-0.9.13`, then
`panel`, `package.json`, `README.md`, `VERIFICATION.md`, `LICENSE`, `NOTICE`,
`THIRD_PARTY_LICENSES`, `catalog.json` and `examples` were replaced from
`extensions/canvas/dist`. `diff -r` matched every installed item against `dist`,
and the manifest still declares only the panel, the `sessions` capability and
`/data/.db/openchamber/canvas/**`. No host service was restarted. The installed
panel has not been opened in the native desktop client.
