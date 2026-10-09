# Canvas verification

## 0.9.0

- Visual alignment with the app's own panels: cards are filled (`color-mix(fg 5.5%)`),
  borderless, 12 px radius, 16 px padding; table rows are filled rounded rows with
  gaps instead of hairlines; section titles 1.0625rem; panel padding 16 px.
  Inspected in MCP Chromium at 700 px, light and dark.
- 28 Bun tests pass; installed with the `filesystem` + `sessions` grants.

## 0.8.1

Current checks on OpenChamber web 2.2.0 are **MCP Chromium**, not native desktop
acceptance. Tests use the production registry and actual panel code.

## 0.8.1

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
history and in `docs/EXPLORATION.md`.


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
- Alignment pass: smaller type scale (h1 1.125rem, h2/body 0.8125rem, metric
  1.5rem), tighter card padding/gaps and the host radius; inspected at 520–760 px
  in light and dark with no horizontal overflow.
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
history and in `docs/EXPLORATION.md`.
