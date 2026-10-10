# Canvas verification

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
history and in `docs/ROADMAP.md`.
