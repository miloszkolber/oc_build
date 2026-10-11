# Canvas presentation

Use when creating, updating, inspecting or debugging an OpenChamber conversation Canvas, including a request copied from its empty state. This procedure owns agent authoring and interaction. The extension README owns renderer development, preview commands and installation.

## Choose the surface

- Reach for Canvas when a result is better seen than read: comparisons, trends, distributions, tables or diagrams. A short chat answer does not need a canvas.
- Conversation Canvas renders catalog JSON from a session file. Write the artifact through available file tools, not as a JSON dump in chat. There is no assumed Canvas-write MCP tool.
- A Doop multiplayer canvas is a different surface with HTML frames and its own tools/guide. Do not substitute it for an OpenChamber conversation Canvas or send HTML frames to this JSON renderer.
- Native Canvas and standalone browser preview are separate surfaces. Browser MCP does not open or operate the native desktop rail. When native controls are inaccessible, ask the operator to open/check them rather than claiming a browser screenshot does so.

## The contract

One conversation owns one canvas. The panel follows the selected conversation, reads a single JSON file and renders it with trusted components. The panel never writes and never shows raw JSON.

- File: the canvas directory the panel reports, `<canvas-dir>/<session-id>.canvas.json`. The panel's empty-state request supplies the exact path for the conversation, so use that when available.
- Session ids are normally safe filename segments. Unusual ids use `session-<16 hex>.canvas.json` (deterministic hash). The single source of truth is the extension's `src/session.js`.
- Write atomically: write a temporary file, then replace. Never leave a half-written file.
- A missing file is an empty canvas, not an error. Invalid JSON shows an error and keeps the last good render.
- With session ancestry access, a child session's panel resolves the ancestor conversation. Without it, resolution falls back to the selected session. Use the panel's resolved request path or verified session context, not an assumed ancestor.

## Author or update a canvas

1. Resolve the exact destination from the panel request or known conversation context. Never guess a session ID from a remembered example. If the ID/path is unavailable, ask for the copied empty-state request.
2. Read the existing artifact before editing. Preserve unrelated sections and use one writer for the conversation file. Keep a recoverable copy when replacing important content. The panel is not a versioned document store.
3. Read the matching build's catalog and gallery example. Installed assets live under the installed extension directory; source builds emit `extensions/canvas/dist/catalog.json` and `dist/examples/`. Locate them rather than assuming the development catalog is installed. Use exact props and limits, not the json-render playground catalog.
4. Choose components by the reading task, supply real labels/units and identify illustrative or estimated data. Compute arithmetic before authoring. `CostChart` alone calculates upfront + monthly × months.
5. Validate a complete UTF-8 candidate before replacing the live file. In the extension source directory, run the sandbox service with `bun scripts/validate.mjs <candidate.canvas.json>` (see the workspace sandbox reference for the compose invocation). If the validator is unavailable, check against the matching catalog and report that limit. JSON syntax alone is insufficient.
6. Write the candidate to a unique temporary file in the destination directory and atomically rename it over the resolved file. Never expose a partial write. Use approved file access and do not widen permissions to bypass a denial.
7. Confirm the panel picks it up while visible or on focus. Report the destination and what was actually checked, with a brief chat summary rather than raw JSON. File validation proves structure, not native rendering.

## Document shape

```json
{ "catalog_version": "1", "title": "...", "spec": { "root": "id", "elements": { "id": { "type": "...", "props": {}, "children": ["id"] } } } }
```

- `root` names one element; every other element must be reachable exactly once.
- Only `Stack`, `Grid`, `Row`, `Card` and `Disclosure` may contain children. Derive this from the catalog's default slots (`CONTAINERS` in source), not an older component list. `Tabs` contains authored label/body entries, not child elements.
- `Grid` takes `columns` 1–4.
- Components span layout (`Stack`, `Grid`, `Row`, `Card`, `Tabs`, `Disclosure`, `Divider`), content (`Heading`, `Text`, `RichText`, `List`, `KeyValue`, `Badge`, `Choice`, `Person`, `Icon`, `Callout`, `CodeBlock`, `Diff`), data and status (`Metric`, `Progress`, `StackedBar`, `Gauge`, `Sparkline`, `Heatmap`, `Rating`, `Tree`), charts (`BarChart`, `LineChart`, `DonutChart`, `StackedBarChart`, `ScatterChart`), collections (`Table`, `Checklist`, `Timeline`, `Steps`), and diagram/quick tools (`Diagram`, `HorizonControl`, `CostChart`). Read `catalog.json` for the exact props.
- At most one `HorizonControl` per canvas; it drives `CostChart`.
- This list is the whole Canvas vocabulary, not a subset of json-render. The authoritative inventory is the extension's generated `catalog.json` (built from `src/catalog.js`), and the panel's empty-state request field lists the same set. json-render is schema-agnostic: the playground's sample components and actions are its own demo catalog, not a Canvas requirement. Canvas defines only display components and no actions, so canvases stay read-only.

A complete same-measure example (illustrative values, not live records):

```json
{
  "catalog_version": "1",
  "title": "Deployment comparison",
  "spec": {
    "root": "root",
    "elements": {
      "root": { "type": "Stack", "props": {}, "children": ["heading", "bars"] },
      "heading": { "type": "Heading", "props": { "title": "Deployments", "subtitle": "Illustrative weekday counts" } },
      "bars": { "type": "BarChart", "props": { "title": "Deploys per weekday", "unit": "deploys", "data": [{ "label": "Mon", "value": 14 }, { "label": "Tue", "value": 22 }] } }
    }
  }
}
```

## Rules that keep rendering predictable

- Use trusted component JSON only. No HTML, scripts, events or expressions.
- Prefer one clear idea per card. Group related metrics in a responsive `Grid`. Charts and many other components already provide a card surface, so avoid redundant card nesting. Use `Heading` for the document hierarchy and `Text`/`Callout` for context and caveats.
- Preserve native host styling. Ordinary selection, ratings, checklist/step marks and timeline dots need no decorative category colors. Use supported `tone` props for explicit semantic state and include readable state labels.
- Compute arithmetic yourself. `CostChart` is the only deterministic calculator (upfront + monthly × months).
- Keep it under 256 KiB and 100 elements. Depth limit is 16.
- `Diagram` code is Mermaid DSL, not an executable document. Use a supported family appropriate to the relationships. Front-matter configuration, unsafe markup, `javascript:` and `%%{init}%%` directives are rejected.
- `Diagram` adopts the panel's theme automatically in light and dark; do not hand-colour nodes or set a Mermaid theme.

## Chart and diagram choices

- Compare directly labeled values of one measure with `BarChart`, or upfront/monthly plans with `CostChart`. One solid fill is sufficient: position, length and exact text identify rows. Do not invent a separate series for every weekday or plan.
- Use `LineChart`/`Sparkline` for an ordered trend, `DonutChart`/`StackedBar` for meaningful parts of a whole, `StackedBarChart` for series contributions across categories, `ScatterChart` for paired quantities and `Heatmap` for matrix intensity. Use `Table` when exact comparison or unsupported values are the primary task.
- Color in charts is allowed when justified by distinct series/categories, ordered magnitude, an intentional highlight or meaningful state. State the reason in the data context when it is not obvious. Do not add color solely to make a chart lively or use success/error hues as arbitrary categories.
- Default to quiet for in-conversation reading: the canvas is read mid-flow like a paragraph, and a loud chart interrupts that flow. Color earns its place when the user must scan, compare at a glance or monitor repeatedly, or when hue carries a meaning labels alone convey slowly ([monochrome case](https://medium.com/design-bootcamp/the-case-for-monochrome-data-visualization-53d2c90c6eb8)).
- Use the catalog's actual encoding capabilities. Automatic charts provide host-derived fills and matching legends, with sparse patterns when fills repeat. There is no arbitrary palette prop. Supported semantic `tone` overrides are not a guarantee of unique series identification. A renderer palette change belongs in extension development, not invented artifact props or injected CSS.
- Do not rely on hue alone where readers must match regions/series. Keep labels, matching legend marks and exact values. Ordered lightness is for ordered quantities, not an implied ranking of unrelated categories; use distinct marks or direct labels for unordered categories instead. Semantic hues must reinforce a label or shape cue, never replace it: red/green status pairs are hard to distinguish for many color-blind readers. A texture on every bar is not an accessibility requirement.
- Preserve honest geometry and data domains. Built-in chart data is nonnegative. Do not clamp negative values, replace missing values with zero or imply live measurements from example data. Use a labeled table or explain the unsupported view instead.
- Keep structural diagrams technical: meaningful authored shapes, concise labels, restrained connections and host type. Do not rewrite topology just to resemble a screenshot. Charts inside Mermaid may use useful color without making structural nodes decorative.
- Give each diagram a meaningful `title`. Put `accTitle:` and `accDescr:` after the Mermaid type line to name and explain relationships for assistive technology. Use `caption` for a visible takeaway. A family name or visual screenshot is not a relationship description.
- If exact chart data is not readily available as text, include a compact `Table`/`KeyValue` or explanatory text alongside the visualization. Hover-only details are not a sufficient sole representation. For renderer changes, load the design accessibility and review procedures from the canonical skill collection to check actual text and essential-mark contrast in both themes. (In-repo snapshot only: the master links these relatively; relative links cannot resolve from this snapshot layout, so they are plain text here. Re-sync must re-apply this transform.)

## User interaction and refresh

| Surface/control | What the user can do | Authoring consequence |
| --- | --- | --- |
| Empty state | Expand/scroll the request, copy it or insert it into the composer | Insertion is a draft, never automatic send. The request contains the resolved destination |
| Table | Filter rows and sort using column controls | Local only. Supply typed numeric cells for numeric data and complete row/footer widths |
| Tabs | Switch authored label/body panels | Local only. Do not put component children inside Tabs |
| Disclosure | Expand/collapse a section | `open` is an authored default, not a persisted user edit |
| HorizonControl | Select planning months | At most one. `initialMonths` must occur in `options`; it drives all CostCharts. Without it the default is 12 months |
| Wide data regions | Focus and scroll tables, code, heatmaps or diagrams locally | Keep readable text instead of shrinking a wide diagram to fit |
| Choice, Checklist, Rating, Steps | Read authored choices, task completion, ratings and progress | These are displays, not editable controls or actions |

There are no submit actions, arbitrary links/events, editing toolbar or write-back API. If a user wants data or a displayed choice changed, update the JSON as the agent. Do not infer their transient table/horizon selection from the file.

The panel polls every three seconds while visible and re-reads on focus/session switches. A missing file shows the empty state. Invalid/unreadable content keeps the selection's last good render with a notice. A session switch clears the previous view and discards stale reads. Unchanged polling retains local state. Compatible updates retain the horizon, while a new selection or removed option uses its authored default. Do not promise persistence of every local control across changed documents.

## Reviewing style changes

1. Follow the extension README's sandbox preview commands. Rebuild served assets after source/style/fixture changes. Use the exact conversation snapshot and packaged panel for like-for-like review, not just a similar gallery example. Only publish content the user approved for review.
2. Wait for the app and required diagrams to finish rendering before capturing screenshots. A collapsed/hidden document can defer diagrams. Do not diagnose an immediate blank capture as a terminal failure.
3. The review browser is standalone MCP Chromium, not the native panel. Verify actual font resolution rather than inferring it from an image version or CSS family string. Matching host tokens and packaged CSS does not ensure the same installed fonts. Use the conversation preview with an explicit artifact snapshot for like-for-like content checks.
4. Check light/dark and narrow panel widths, readable labels/units, zero/tiny/single-point geometry, local overflow and control focus. For interaction claims, exercise table search/sort, tabs, disclosure and horizon changes, then confirm the authored file is unchanged. Rendering an example is not proof of those interactions.
5. For renderer changes, test conversation switches, missing/invalid recovery and diagram lifecycle with disposable fixtures. Do not overwrite the approved conversation artifact to fault-inject it. Record operator native approval separately from automated/browser evidence and installed-version parity. Approval is not permission to install, restart, push or merge.

## Getting it visible

1. Ask the user to open Canvas from the rail if it is not visible. Artifact updates need no client reload. Extension installation/upgrades have a separate reload procedure.
2. If nothing appears, check the resolved session/path and permitted file access first, then JSON/catalog validation, graph reachability and allowed containers. A valid file at another session's path is not success.
3. If only a diagram fails, check its DSL, unsafe directives and visible-document state. Use the diagram error and simplify the failing example rather than guessing new styles or cycling reloads.

Completion: the artifact validates against the matching catalog and renders in the conversation the user is watching, or the exact unverified surface/access blocker is reported. Do not equate a written file, preview screenshot or operator approval with checks you did not execute.
