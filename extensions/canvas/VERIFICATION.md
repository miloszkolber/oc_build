# Canvas verification

## 0.9.11

- Visual system pass on `panel/style.css`, requested to remove the generic
  AI-generated look: color discipline (one accent for selection/active states,
  host status colors for state, a single accent-tinted ramp for chart series
  instead of five unrelated hues), bordered elevated cards instead of borderless
  fill blobs, a tightened type scale (eyebrows at 11px, secondary text at
  13px with `--muted-strong` for contrast), tabular numerals everywhere
  numbers align, and stronger states (solid fill checkboxes/step circles,
  primary-tinted selected chips and radio segments, raised active tab on a
  subtle track, visible focus ring).
- Mermaid token names and all component class names are unchanged; the theme
  map still resolves the same custom properties. Renderer JSX is untouched.
- Verified in the preview page (MCP Chromium) in light and dark across every
  component section, plus interaction states (tab switch, disclosure open).
  40 tests pass. Preview harness now supplies proportional `--oc-font` because
  the review Chromium maps `ui-sans-serif` to a monospace face.
- Production ZIP `openchamber-generative-canvas-0.9.11.zip`.

## 0.9.10

- Simplification pass. Removed the redundant `showcase` example: the `gallery`
  covers every component and `cost-explorer` covers the interactive tools, so
  the build, the ZIP and the Canvas workflow now emit two examples instead of
  three (ZIP 119 -> 118 files). Dropped the `renderer.jsx` re-export of
  `initialMonths` in favour of importing it from `catalog.js`, and the unused
  `CATALOG_VERSION` export. `Metric` now uses the shared `toneClass` helper.
- 40 Bun tests pass (the removed example took its own test with it).
- Production ZIP `openchamber-generative-canvas-0.9.10.zip`.

## 0.9.9

- Vocabulary expanded from 29 to 39 components, driven by a review of four
  agent-UI vocabularies: Adaptive Cards (TextBlock/RichTextBlock, FactSet,
  ColumnSet, Table, actions), A2UI (Row, Column, List, Text, Image, Icon,
  Divider, Card, Tabs, Modal, inputs), Open Intelligent UI (CopilotKit + AG-UI;
  agent picks text, a native component or a custom UI, plus a template library)
  and MCP Apps (protocol only: `ui://` resources bound to tools; kept separate,
  as the README already defers it).
- Added Row, Disclosure, Tabs, Icon, RichText, Choice, Person, Diff, Rating and
  Tree. Row and Disclosure are new default-slot containers, so the parser now
  derives allowed parents from `CONTAINERS` instead of a hardcoded list. The
  Icon set inlines eight Remix outlines. Text gained `variant`/`align`; Table
  gained per-column `align` and an optional `footer` totals row (validated to
  match the column count). All remain read-only: no actions, no inputs.
- The gallery example now covers all 39 components; 41 Bun tests pass. Shipped
  as `examples/gallery.canvas.json`; the served `bun run preview` page shows the
  full gallery in light and dark.
- Production ZIP `openchamber-generative-canvas-0.9.9.zip`.

## 0.9.8

- Vocabulary expanded from 13 to 29 read-only display components: Divider, List,
  KeyValue, Badge, Callout, CodeBlock, Progress, StackedBar, Gauge, Sparkline,
  Heatmap, StackedBarChart, ScatterChart, Checklist, Timeline and Steps, plus the
  original layout/text/status/chart/collection components. `Metric` and the new
  components share one `tone` enum (neutral/blue/green/amber/red). No actions and
  no inputs, so canvases stay read-only.
- Body validators added: a Heatmap row length must equal its columns, and a
  StackedBarChart series length must equal its categories.
- A `gallery` example exercises every component once and is emitted to
  `dist/examples/gallery.canvas.json`; the coverage test now asserts it, and a
  renderer test renders it.
- Added `bun run preview`: a served page (`preview/`) that renders the real
  Canvas with host-like tokens, a light/dark toggle and a component index, so a
  reviewer can inspect every component and propose changes.
- Fixed two rendering defects found in the preview: the sparkline stretched to
  full width with a scaled stroke (now a fixed 40 px track with
  non-scaling stroke), and inline Badges stretched across grid cells (now
  `justify-self:start`). Cards in a grid are top-aligned so a short card no
  longer stretches to a tall neighbour's height.
- 40 Bun tests pass; production ZIP `openchamber-generative-canvas-0.9.8.zip`.
  Reviewed in MCP Chromium at 1100 px in light and dark.

## 0.9.7

- Diagram rendering is serialized. Mermaid is a singleton with one global config
  and one temporary DOM node per render, so two diagrams drawing at once could
  make one measure a detached node ("svg element not in render tree"). A module
  queue now runs initialize+render one at a time. Also confirmed `accTitle` and
  `accDescr` must follow the diagram type line: putting `accTitle` first fails
  with "No diagram type detected". The `Diagram` description now says so.
- Cards no longer nest. A component rendered inside a card drops its own surface
  (`.card .card`), which removed the card-in-card blocks and the doubled padding;
  card spacing is one 12 px flex gap instead of stacked child margins.
- The horizon control is styled as the app's segmented control (bordered pills, a
  filled selected segment, visible keyboard focus) instead of a blue-tinted group.
- Metric typography aligned to the app's Stats reference (muted 0.875rem label,
  2rem value, muted 0.8125rem detail), and an odd last card spans the row when a
  grid collapses at 640 px, removing the half-width orphan.
- Preview canvas rewritten and validated; both diagrams render. Reviewed in MCP
  Chromium at 560 px in light and dark.
- 37 Bun tests pass; production ZIP `openchamber-generative-canvas-0.9.7.zip`.

## 0.9.6

- Empty-state feedback applied. The request field's fade now blends into the
  field's own fill (an opaque `--prompt-fill`) instead of the panel background.
  The copy button shows a green "Copied" pill with its own background, and the
  insert button keeps its label. A `sparkling-2-line` icon sits above the
  empty-state text, drawn as inline SVG because the panel iframe cannot use the
  app's icon sprite. Collapsing the expanded request resets its scroll to the
  top.
- The insert button uses the neutral secondary surface instead of a blue tint,
  matching the app's buttons.
- Merged `origin/main`, which fixes the panel icon: the app resolves the
  manifest key verbatim against a suffix-less sprite, so the bare `palette` key
  is required.
- Verified in MCP Chromium with a harness that mounts the real `panel.jsx`
  against a stubbed host: empty state in light and dark, the "Copied" state, and
  the expand/scroll/collapse reset (scrollTop 120 → 0).
- Preview canvas written to
  `/data/.db/openchamber/canvas/ses_edcc27679ffer6jLb9pJBgVkjS.canvas.json`
  (validated) so the conversation shows the result.
- 37 Bun tests pass; production ZIP `openchamber-generative-canvas-0.9.6.zip`.

## 0.9.5

- Panel icon uses the bare key `palette`. The app resolves an icon by looking up
  its own map with the manifest string used **verbatim** (`id="oc-<key>"`), and
  its sprite keys carry **no** `-line`/`-fill` suffix (`palette`,
  `bar-chart-box`, `pencil-ruler-2`). Every `*-line` name therefore missed and
  the rail fell back to the same default glyph, which is why three different
  names looked identical. `painting-ai` does not exist in the app's sprite at
  all.
- UI polish pass against the app's own control metrics (read from the SDK UI
  kit CSS) and the host root scale. Harness reproduced `applyHostReady`'s
  `font-size: 0.875rem` so the review matched the real panel.
- Line chart no longer distorts. It used `preserveAspectRatio="none"` with a
  fixed height, so circles became ellipses and strokes stretched. It now uses
  `aspect-ratio: 600/180`; a point measured 4.35×4.35 px at 327 px wide instead
  of 4.35×6.22 px before.
- Horizon control keyboard focus is now visible. The radio input is visually
  hidden, so focus had no indicator; the option label shows the host focus ring
  (`0 0 0 2px`), verified by focusing the input.
- Search field aligned to the kit's `.oc-sdk-input`: `var(--radius)` corner,
  inset 1px border, hover wash and an inset 2px focus ring. Trend badge font
  matched `.oc-sdk-badge` (11 px). Error notice matched `.oc-sdk-banner`
  (8 px radius, 8×12 px padding).
- Diagram shows a "Rendering diagram…" status and keeps the host hidden until
  the async Mermaid render finishes, so a canvas never shows a blank card and
  assistive technology does not announce an empty image.
- Fixed a React warning: the line chart point `<title>` now renders a single
  string instead of a child array.
- README corrected: removed a stale actions-menu / Export-JSON description and
  an inaccurate claim that the panel embeds the SDK UI kit. It now documents the
  token-styled chrome and the local, transient interaction.
- Reviewed in MCP Chromium at 360, 520 and 780 px in light and dark: no
  horizontal overflow, diagrams and interactions hold. 37 Bun tests pass;
  production ZIP `openchamber-generative-canvas-0.9.5.zip` builds.

## 0.9.4

- Mermaid theming completed. The previous map set roughly 15 of the base
  theme's 224 variables and left `darkMode` unset, so only flowchart and
  sequence were evidenced. `src/mermaid-theme.js` now derives the full set from
  the host tokens: base, sequence, gantt, state, class, pie, gitGraph,
  quadrant, venn, requirement and architecture, plus the object-shaped `radar`,
  `xyChart`, `cynefin` and `wardley` families.
- Render-verified 20 diagram families in MCP Chromium in light **and** dark
  (flowchart, sequence, class, state, ER, gantt, pie, quadrant, gitGraph,
  requirement, mindmap, timeline, xychart, sankey, block, radar, treemap, venn,
  kanban, user journey). All 20 rendered with no failures in both modes. The
  radar graticule (`#DEDEDE`) and the xyChart cream palette (`#FFF4DD,…`) were
  the remaining hardcoded light defaults, now themed.
- Two defects were found by rendering, not by tests. Chromium serialises a
  `color-mix()` result as `color(srgb …)`, which Mermaid's colour parser
  rejects, so the resolver normalises it to hex/rgba. `xyChart.plotColorPalette`
  is comma-split, so palette entries must not contain commas — hence hex.
- Regression checks added. `test/mermaid-theme.test.js` asserts that `darkMode`
  follows the theme, that every diagram family has its variables, that the
  object-shaped families are objects, and that `color(srgb …)` normalises to a
  comma-free colour. Catalog and renderer tests cover the narrowed guard and
  `accTitle`/`accDescr`.
- The agent contract is generated from `catalog.js` (`componentsSummary`,
  `CONTAINERS`) instead of a hand-maintained list in `panel.jsx`. The `Diagram`
  description and the README list the wider Mermaid 12 type set.
- The diagram guard was narrowed to `(?:^|[\s"'<=])on[a-z]+\s*=`, so a valid
  label such as `A[connection=fast]` is accepted while attribute-position
  handlers are still blocked. Front-matter and `%%{init}%%` remain rejected.
- `Diagram` honours Mermaid `accTitle`/`accDescr` for its accessible name and
  description.
- Worktree initialisation fixed separately on the host: `XDG_DATA_HOME` moved off
  the container tmpfs to `/data/.db/openchamber/xdg-data` so the host OpenCode can
  see the worktree directory (operator confirmed worktrees now come up).
- 36 Bun tests pass, and the production ZIP
  `openchamber-generative-canvas-0.9.4.zip` builds (118 files). Checks are MCP
  Chromium, not native desktop acceptance.

## 0.9.3

- Dependabot updates applied: `fflate` 0.8.3 and `mermaid` 12.1.0.
- Mermaid 12 was render-checked before adoption, because no test renders a
  diagram at runtime: an isolated build was served to MCP Chromium and both
  showcase diagrams rendered in light and dark (dark node fill
  `rgb(30, 33, 37)`). CI passing alone would not have proved this.

## 0.9.1

- Simplification: removed the unused `snapshot()` helper (the panel is read-only)
  and the redundant `revenue-pulse` example; the showcase already covers every
  component. 27 tests pass and the packaged ZIP is 117 files.
- Dependency updates handled by Dependabot (weekly npm pull requests for this
  directory); Mermaid pinned to an exact version so upgrades are deliberate.

## 0.9.0

- Visual alignment with the app's own panels: cards are filled (`color-mix(fg 5.5%)`),
  borderless, 12 px radius, 16 px padding; table rows are filled rounded rows with
  gaps instead of hairlines; section titles 1.0625rem; panel padding 16 px.
  Inspected in MCP Chromium at 700 px, light and dark.
- 28 Bun tests pass; installed with the `filesystem` + `sessions` grants.

## 0.8.1

Current checks on OpenChamber web 2.2.0 are **MCP Chromium**, not native desktop
acceptance. Tests use the production registry and actual panel code.

- 28 Bun tests passed; production ZIP installed with the `filesystem` +
  `sessions` grants.
- Type scale corrected. `applyHostReady` pins the panel root at `0.875rem`
  (14 px), so the first pass rendered 0.875rem body text at 12.25 px. Body and
  table text are now 1rem (14 px), h1 1.375rem, metric 2rem — measured in the
  running panel.
- Search field: removed the double focus ring (the inner input no longer draws
  its own ring; the field shows a primary border on focus).
- Table sort no longer reflows columns: the sort arrow reserves a fixed-width
  slot. Measured column widths are identical before and after sorting
  (`130,189,130,153` both ways).
- Table caption spacing increased (`margin-top: 8px`).

## 0.8.0

- 28 Bun tests passed (schema/renderer boundaries, 256 KiB limit, session-file
  derivation, showcase coverage including `Diagram`, diagram input rejection).
- Production Canvas 0.8.0 ZIP installed through the supported extension API
  with the exact `filesystem` + `sessions` grants; still no service, no page.
- Toast removal: the success notice is gone. A read failure renders as an
  absolutely-positioned overlay; verified `position: absolute` and that the
  empty state's top offset does not change, so nothing shifts.
- Empty state now carries the agent request as a read-only field: collapsed
  with an overflow gradient, expandable (`Show less`) to a scrollable view,
  copy button, and **Insert into composer** below. Clicking insert added no
  banner and shifted the empty state by 0 px while the composer received text.
- Mermaid `Diagram` renders in both themes and re-renders on theme switch;
  subagent sessions show the parent conversation's canvas.

Two QA findings fixed here: the earlier success banner was the cause of the
mis-aligned empty state, and the insert action's feedback is now the composer
itself rather than a toast.

The temporary QA host uses the real SDK and the actual approved host file API.
It permits DOM inspection without weakening OpenChamber's opaque production
iframe. Native desktop acceptance is still operator-owned. No transcript
access, MCP Apps transport or live business-data connection is claimed.
Older global artifact files were left on disk untouched and are not displayed.

## Earlier (0.2–0.7)

CRUD service, conversation scoping, UI-kit chrome, the showcase example,
token-based styling, removal of all panel chrome, the Mermaid `Diagram`
component and parent-canvas resolution for subagent sessions were each
installed and verified in MCP Chromium. Details are preserved in the repository
history and in [`docs/`](../docs/README.md).
