# Canvas

OpenChamber 2.2.0+ panel extension for agent-presented data visualization. One
conversation owns one canvas: the panel follows the currently selected
conversation and renders its JSON with trusted components. JSON never supplies
JavaScript or HTML. Uses json-render 0.21.0 and OpenChamber SDK 2.2.0,
including its UI kit (`applyHostReady`, `mountEmpty`, `mountBanner`,
`mountMenu`) for theme, empty states, notices and the actions menu. The
preview/source icon toggle stays custom to match the reference frame.

## Use

Open Canvas from the rail. The frame holds only preview/source toggles and an
actions menu, top-right — and only while the conversation has a canvas. Empty
states show no buttons at all. There are no artifact names, no selector and no
management: an empty conversation shows an empty canvas until its agent writes
one. Switching conversations switches canvases immediately; nothing from the
previous conversation is kept on screen.

The actions menu holds Export JSON, Copy JSON and Copy file path. Export and
Copy use the current horizon-control selection. Horizon controls, table
search/sort and chart rendering are local and transient; the agent's file is
never rewritten by the panel. Copy file path reveals the exact session file
for this conversation, useful when telling the agent where to write.

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

Build emits `dist/catalog.json` and `dist/examples/cost-explorer.canvas.json`,
`dist/examples/revenue-pulse.canvas.json` and
`dist/examples/showcase.canvas.json`. The showcase exercises every catalog-1
component once with illustrative data — the fastest pattern reference for
agents. Validate with `bun scripts/validate.mjs <file.canvas.json>`. Source of
truth: `src/catalog.js`.

| Component | Purpose |
| --- | --- |
| Stack, Grid, Card | Vertical layout, responsive 1–4-column grids and sections |
| Heading, Text | Dashboard hierarchy and escaped plain text |
| Metric | Value, optional detail/change and blue/green/amber accent |
| BarChart, LineChart, DonutChart | Labeled bars, shaded trend and distribution |
| Table | Searchable/sortable bounded data table |
| HorizonControl, CostChart | Shared horizon and deterministic upfront + monthly × months |

Catalog 1 remains compatible with 0.1.0/0.2.0 components. Files written by
older global Canvas versions stay on disk but are no longer displayed; do not
delete other files in the directory. To preserve something important, copy or
export its JSON elsewhere — the panel is a presentation surface, not storage.

## Build and install

1. Run `bun install --frozen-lockfile`, `bun test`, then `bun run package` here.
2. Install `dist/openchamber-generative-canvas-0.4.0.zip` through OpenChamber Extensions.
3. Review and approve the `/data/.db/openchamber/canvas/**` filesystem declaration.
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
