# Canvas

OpenChamber 2.2.0+ panel extension for agent-presented data visualization. One
conversation owns one canvas: the panel follows the currently selected
conversation and renders its JSON with trusted components. JSON never supplies
JavaScript or HTML, and the panel never shows JSON to the user. Uses
json-render 0.21.0 and OpenChamber SDK 2.2.0.

Styling is derived entirely from the host theme variables written by
`applyHostReady` (`--oc-bg`, `--oc-fg`, `--oc-elevated`, `--oc-muted`,
`--oc-border`, `--oc-hover`, `--oc-primary`, `--oc-radius`, `--oc-font`, the
`--oc-*` status colours and the `--oc-*-text` aliases). Visual language: cards
carry hairline borders on elevated surfaces, one accent is reserved for
selection and active states, host status colours mark state, and chart series
read as a single accent-tinted ramp. Cards, tables, badges and controls use the
same radius, borders and type scale as the rest of OpenChamber, so a canvas
looks like part of the app rather than a dropped-in website. Mermaid diagrams
are themed from the same tokens across their diagram types, so they too follow
the host in light and dark. The panel renders its own empty state, error notice
and controls from those tokens, matching the app's control metrics and focus
treatment rather than embedding the imperative SDK UI kit.

## Use

Open Canvas from the rail. The panel is a read-only presentation: it renders
the conversation's canvas and nothing else. There is no toolbar and no menu.
Raw JSON is never shown, and the panel never writes the agent's file.

An empty conversation shows a sparkle icon and the request the agent needs, as a
read-only field: collapsed with a fade, expandable to a scrollable view, with a
copy button that briefly confirms **Copied** and a neutral **Insert into
composer** button below. Nothing is sent automatically — copy it or insert it,
then send it yourself. There are no toasts; a read failure appears as a
floating notice that does not move the canvas.

Interaction is local and transient: horizon controls, table search and sort,
and diagram rendering. The panel never writes back, so a change made here never
rewrites the agent's file. To tell the agent where to write, expand the request
field in the empty state and copy or insert it.

Tables filter/sort locally. Charts, metric trends and responsive grids render
with a dedicated sans-serif visualization hierarchy. Examples in
`dist/examples/` are illustrative data, not live records.

## Conversation context

The SDK supplies the selected conversation in `onReady(context.session)` and
publishes changes through `host.onSession(listener)`. The snapshot carries
`id`, `title`, `busy` and optional `model`/`agent`; `null` means no
conversation is selected. No message history is exposed.

The panel polls the session file every three seconds while visible, plus on
focus and on every conversation switch. Late reads after a switch are
discarded. A missing file is an empty canvas, not an error. Invalid JSON shows
an error banner and keeps the last good rendering for that conversation.

A subagent runs in a child session. With the `sessions` capability granted, the
panel resolves the current session's ancestors once per switch and shows the
top-level conversation's canvas, so a subagent task displays the canvas it is
working for. If the capability is not granted, or the lookup fails, the panel
falls back to the current session's own file. The agent request draft targets
the same resolved file.

## Advertising to agents

The contract above only helps an agent that already knows Canvas exists. OpenChamber
extensions cannot contribute skills or instruction files, so the panel advertises
through what it can reach:

| Mechanism | Who sees it | Behaviour |
| --- | --- | --- |
| Read-only request field | User | Shows the full contract, component list and exact path; copy button, expand/scroll, **Insert into composer** |
| Empty-state text | User | Names the intent: ask the agent to visualize or present data |
| `contributes.commands` / `actions` | User | Not used: a slash command resolves to an attach chip, not a prompt, so it cannot carry the contract cleanly |
| Host skill or `AGENTS.md` | Agent | Outside the extension. Strongest autonomous discovery; recommended as a small follow-up |

The panel deliberately exposes no toolbar of its own; the request field lives
only in the empty state.

Recommended follow-up: add a short Canvas note to the agent instruction surface
(a skill or the repository `AGENTS.md`) that states the file path pattern, the
catalog components and "hidden in the Canvas panel — write JSON, never chat".
That removes the compose step for agents that read instructions. The compose
action covers the case where no instruction was read.

## Agent contract

Write a UTF-8 JSON document to the conversation file:

`/data/.db/openchamber/canvas/<session-id>.canvas.json`

Prefer atomic replacement (write a temporary file, then rename). Session ids
are normally safe filename segments, so `<session-id>.canvas.json` applies;
for anything unusual the panel reads `session-<16 hex>.canvas.json` using a
deterministic FNV-1a hash — see `src/session.js`, the single source of truth.
Nothing else in the directory is read by the panel.

Include exactly `catalog_version: "1"`, `title`, and
`spec: { "root": "id", "elements": { ... } }`. Elements contain `type`, `props`
and optional `children`.

Build emits `dist/catalog.json`, `dist/examples/cost-explorer.canvas.json`
(interactive tools) and `dist/examples/gallery.canvas.json` (every component
once). The gallery is the fastest pattern reference for agents. Validate with
`bun scripts/validate.mjs <file.canvas.json>`. Source of truth: `src/catalog.js`.

This table is the whole Canvas vocabulary, not a subset of json-render. The
authoritative inventory is the generated `dist/catalog.json`, and the panel's
request field lists the same set. json-render is schema-agnostic, so the
playground's sample components and actions are not a Canvas requirement; Canvas
defines display components only and no actions, which keeps canvases read-only.

Dependencies are pinned exactly. Dependabot opens weekly update pull requests
for `/extensions/canvas`; merging one runs the normal tests, package step and
ZIP artifact. No custom scanner is needed.

| Group | Components |
| --- | --- |
| Layout | Stack, Grid, Row, Card, Tabs, Disclosure, Divider |
| Content | Heading, Text, RichText, List, KeyValue, Badge, Choice, Person, Icon, Callout, CodeBlock, Diff |
| Data and status | Metric, Progress, StackedBar, Gauge, Sparkline, Heatmap, Rating, Tree |
| Charts | BarChart, LineChart, DonutChart, StackedBarChart, ScatterChart |
| Collections | Table, Checklist, Timeline, Steps |
| Diagram and quick tools | Diagram, HorizonControl, CostChart |

`Diagram` renders Mermaid DSL: flowchart, sequence, class, state, ER, gantt,
pie, quadrant, requirement, gitGraph, C4, mindmap, timeline, sankey, xychart,
block, packet, kanban, architecture, radar, treemap, venn, ishikawa, wardley and
more. `HorizonControl` and `CostChart` share a planning horizon and compute
upfront + monthly × months. Run `bun run preview` to serve a live gallery of
every component (dark and light) for review. The preview resolves typography
through the same token chain as the panel, so host or system font resolution
decides the face in both.

Charts encode every series twice. Series keep the single-hue accent ramp, and
each one also carries a repeating pattern (solid, diagonal, dots, crosshatch,
grid) that the legend repeats, so adjacent steps stay separable without relying
on color. Single-series charts stay solid. `Diagram` renders wait for a rendered
document, so a collapsed panel or hidden tab defers the render instead of
failing it, and a transient Mermaid measurement failure is retried once.

Catalog 1 remains compatible with 0.1.0/0.2.0 components. Files written by
older global Canvas versions stay on disk but are no longer displayed; do not
delete other files in the directory. To preserve something important, copy or
export its JSON elsewhere — the panel is a presentation surface, not storage.

## Build and install

1. Run `bun install --frozen-lockfile`, `bun test`, then `bun run package` here.
2. Install `dist/openchamber-generative-canvas-0.9.13.zip` through OpenChamber Extensions.
3. Review and approve the `/data/.db/openchamber/canvas/**` filesystem and `sessions` declarations.
4. Reload the client to discover the updated Canvas entry. Canvas is panel-only;
   it declares no page surface.

There is no extension service, background process, model key, generated-code
execution or network authority. The panel reads and the agent writes through
the host file API and the approved filesystem scope; canonical paths are
compared so symlinks cannot widen it. The built-in browser is unchanged.

Canvases are bounded to 256 KiB of UTF-8. Structural validation rejects
unknown props/types, actions/expressions/events, invalid graphs, numeric
bounds and malformed table rows. Files larger than the limit fail explicitly.

## Recovery and verification

Back up `/data/.db/openchamber/canvas` with app data. Restore files without
renaming them. The store is independent of extension installation and project
deletion. Before an upgrade, retain the prior ZIP/installed directory and data
backup.

See `VERIFICATION.md` for executed checks and the MCP Chromium/native desktop
boundary. MCP Apps, arbitrary documents and simulations remain separate future
capabilities.
