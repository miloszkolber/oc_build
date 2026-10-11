# Canvas presentation

Use when an agent should show data in the Canvas panel, or when the panel's behaviour is wrong. This procedure owns the conversation-canvas contract, not a charting library manual.

## The contract

One conversation owns one canvas. The panel follows the selected conversation, reads a single JSON file and renders it with trusted components. The panel never writes and never shows raw JSON.

- File: `/data/.db/openchamber/canvas/<session-id>.canvas.json`.
- Session ids are normally safe filename segments. Unusual ids use `session-<16 hex>.canvas.json` (deterministic hash). The single source of truth is the extension's `src/session.js`.
- Write atomically: write a temporary file, then replace. Never leave a half-written file.
- A missing file is an empty canvas, not an error. Invalid JSON shows an error and keeps the last good render.
- A subagent runs in a child session and its panel shows the **ancestor** conversation's canvas, so write to the conversation the user is watching.

If the user has not asked for a canvas, a chat message is usually enough. Reach for Canvas when a result is better seen than read: comparisons, trends, distributions, tables, diagrams.

## Document shape

```json
{ "catalog_version": "1", "title": "...", "spec": { "root": "id", "elements": { "id": { "type": "...", "props": {}, "children": ["id"] } } } }
```

- `root` names one element; every other element must be reachable exactly once.
- Only `Stack`, `Grid` and `Card` may contain children. Everything else is a leaf.
- `Grid` takes `columns` 1–4.
- Components span layout (`Stack`, `Grid`, `Row`, `Card`, `Tabs`, `Disclosure`, `Divider`), content (`Heading`, `Text`, `RichText`, `List`, `KeyValue`, `Badge`, `Choice`, `Person`, `Icon`, `Callout`, `CodeBlock`, `Diff`), data and status (`Metric`, `Progress`, `StackedBar`, `Gauge`, `Sparkline`, `Heatmap`, `Rating`, `Tree`), charts (`BarChart`, `LineChart`, `DonutChart`, `StackedBarChart`, `ScatterChart`), collections (`Table`, `Checklist`, `Timeline`, `Steps`), and diagram/quick tools (`Diagram`, `HorizonControl`, `CostChart`). Read `catalog.json` for the exact props.
- At most one `HorizonControl` per canvas; it drives `CostChart`.
- This list is the whole Canvas vocabulary, not a subset of json-render. The authoritative inventory is the extension's generated `catalog.json` (built from `src/catalog.js`), and the panel's empty-state request field lists the same set. json-render is schema-agnostic: the playground's sample components and actions are its own demo catalog, not a Canvas requirement. Canvas defines only display components and no actions, so canvases stay read-only.

## Rules that keep rendering predictable

- Use trusted component JSON only. No HTML, scripts, events or expressions.
- Prefer one clear idea per card. Group related metrics in a `Grid`.
- Color is signal, not decoration: use `tone` for state (green success, amber caution, red danger, blue neutral emphasis). Chart series automatically read as one accent-tinted ramp, so charts stay quiet; do not try to recolor them per series.
- Compute arithmetic yourself. `CostChart` is the only deterministic calculator (upfront + monthly × months).
- Keep it under 256 KiB and 100 elements. Depth limit is 16.
- `Diagram` code is Mermaid DSL: flowchart, sequence, class, state, ER, gantt, pie, quadrant, requirement, gitGraph, C4, mindmap, timeline, sankey, xychart, block, packet, kanban, architecture, radar, treemap, venn, ishikawa, wardley and more. HTML-like markup, `javascript:` and `%%{init}%%` directives are rejected.
- `Diagram` adopts the panel's theme automatically in light and dark; do not hand-colour nodes or set a Mermaid theme.

## Reviewing style changes

1. Serve the gallery with `bun run preview` (.defaults to port 8800). It copies `panel/style.css` into `preview/dist` at startup only — restart it after any style or preview-file edit.
2. Screenshot after the app has actually rendered: poll for the app's landmark (e.g. `.card` elements) with a `requestAnimationFrame` loop in `browser_evaluate` before `browser_screenshot`. Screenshots taken at `domcontentloaded` can come back blank.
3. The review browser is the standalone `openchamber-browser` MCP image; since its 1.1.2 font stack it resolves modern UI family names to proportional faces. The panel itself inherits the host's font, so treat harness fonts as emulation.

## Getting it visible

1. Resolve the conversation's session id and build the path. The panel's empty state shows the exact path and can copy or insert a request.
2. Write the file atomically.
3. The panel picks it up within a few seconds and on focus. No reload is needed.
4. If nothing appears, check in order: correct session id, valid JSON, reachable `root`, and only Stack/Grid/Card with children.

Completion: the canvas renders in the conversation the user is watching, and the file validates against the catalog before you report success.
