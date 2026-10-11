# Evidence

Canvas panel, change `canvas-render-integrity`. Commands run from the repository
root; extension paths are relative to `extensions/canvas`. Evidence is MCP
Chromium (`browser` MCP, image `1.1.2-6c3fb33`) and is not native desktop
acceptance. Observer-reported screenshots are labelled as such.

## Reproduction of the reported diagram failure

Reviewer report: two diagrams in one canvas showed
`Diagram could not be rendered: svg element not in render tree` and stayed that way.

Harness: the artifact removed in Canvas 0.9.10 (`git show 64ae5f9:extensions/canvas/src/examples.js`
→ `showcase`, the artifact that produced the report) rendered through the
current `renderer.jsx`, with the guest document itself not rendered, mirroring a
collapsed panel, hidden tab or conversation switch. Mermaid appends its temporary
node to `document.body`, so it is laid out only when that document is rendered.

| Condition (before the fix) | Result |
| --- | --- |
| Old artifact, document rendered | 2/2 diagrams rendered, no error |
| Old artifact, fast re-reads + theme flips mid-render | 2/2 rendered, no error |
| Old artifact, canvas subtree `display:none` | 2/2 rendered (Mermaid measures at body) |
| Old artifact, guest document `display:none` | **1 rendered, 1 failed: `svg element not in render tree`** |
| Same page after the document becomes rendered | error persists; diagram stays broken |

Conclusion: a transient measurement failure stored as terminal state.

## Recorded checks (after the fix)

| Check | Command / method | Result |
| --- | --- | --- |
| Diagram defers while hidden | Hidden-then-shown harness against current source | hidden: 0 errors, 2 pending; after show: **2/2 rendered, 0 errors, 0 pending**, no user action |
| Normal render unaffected | Preview gallery, visible document | 2/2 diagrams rendered, 0 errors |
| Unit tests | `bun test` (extensions/canvas) | **42 pass, 0 fail**, 238 assertions (was 40) |
| Multi-series patterns | new unit test + preview render | `bar-fill pat-2`, `series-dot pat-3`, `stacked-seg pat-2`, `stack-seg pat-2`, `series-pattern`, `donut-track`; no `conic-gradient` |
| Single-series stays solid | new unit test | line/progress/sparkline output contains no `pat-` |
| Donut values unchanged | new unit test | `aria-label="Donut: p 50%, q 25%, r 25%"` |
| Scroll gutter | `offsetWidth - clientWidth` on `.canvas` and `.table-scroll` while overflowing | **0px both**, canvas still scrollable (`scrollHeight > clientHeight`) |
| Focus ring ownership | `.focus()` on filter input, computed style | input `box-shadow: none`; wrapper border carries the single accent ring |
| Preview parity | served `preview/dist/index.html` | zero `oc-font` matches; preview resolves the panel's token chain |
| Example validation | `bun scripts/validate.mjs` on both examples | both valid catalog-1 canvases |
| Package/install | `bun run package`, unzip + `diff -r` | `openchamber-generative-canvas-0.9.13.zip`, 118 files, installed copy IDENTICAL (backup `generative-canvas-0.9.12`) |
| Visual review, light + dark | preview screenshots of donut, bars, stacked columns, table, search focus | patterns read in both themes; ink adapts via `--bg` |

## Reviewer observations addressed

- Donut slices were near-identical blues → SVG ring with per-slice patterns and
  2px separation; legend swatches enlarged to 11px to carry the pattern.
- Chart series distinguished by color alone → pattern channel added to every
  multi-series visual.
- Diagram errors latched → deferral plus single retry.
- Filter input showed two focus rings → wrapper owns the indicator.
- Scrollbars could shift content → hidden, no reserved gutter.
- Preview pinned its own font → pin removed, one token chain.

## Not covered

- Native desktop client rendering and acceptance (owned by
  `accept-canvas-panel-on-desktop`).
- Non-Chromium engines: only the packaged Chromium runtime was exercised.
- Diagram deferral is verified in the packaged runtime rather than a unit test:
  the unit suite renders to static markup, where effects never run. The SSR
  contract (`Rendering diagram…`, `aria-busy`) stays covered by existing tests.