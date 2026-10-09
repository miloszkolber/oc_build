# Canvas

OpenChamber 2.2.0+ panel extension for agent-presented data visualization. One
conversation owns one canvas: the panel follows the currently selected
conversation and renders its JSON with trusted components. JSON never supplies
JavaScript or HTML, and the panel never shows JSON to the user. Uses
json-render 0.21.0 and OpenChamber SDK 2.2.0.

Styling is derived entirely from the host theme variables written by
`applyHostReady` (`--oc-bg`, `--oc-fg`, `--oc-elevated`, `--oc-muted`,
`--oc-border`, `--oc-hover`, `--oc-primary`, `--oc-radius`, `--oc-font`, the
`--oc-*` status colours and the `--oc-*-text` aliases). Cards, tables, badges
and controls use the same radius, borders and type scale as the rest of
OpenChamber, so a canvas looks like part of the app rather than a dropped-in
website. Empty states, notices and the actions menu use the SDK UI kit
(`mountEmpty`, `mountBanner`, `mountMenu`).

## Use

Open Canvas from the rail. The panel is preview-only: it renders the
conversation's canvas and never shows raw JSON. There is no export, no copy
JSON, no source view. While a canvas exists, a single top-right menu offers
**Copy file path** — useful when pointing an agent at the file. The agent's
file is never rewritten by the panel.

An empty conversation shows an empty canvas with one action, **Draft a request
for the agent**, which inserts a ready-made Canvas prompt (contract, component
list and exact file path) into the composer. Nothing is sent automatically;
edit or send it yourself. Empty states and notices use the SDK UI kit; there
are no other buttons.

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

## Advertising to agents

The contract above only helps an agent that already knows Canvas exists. OpenChamber
extensions cannot contribute skills or instruction files, so the panel advertises
through what it can reach:

| Mechanism | Who sees it | Behaviour |
| --- | --- | --- |
| Empty-state action | User | **Draft a request for the agent** composes the full contract, component list and exact path into the composer |
| **Copy file path** menu | User | Hands the precise session file to an agent or a person |
| Empty-state text | User | Names the intent: ask the agent to visualize or present data |
| `contributes.commands` / `actions` | User | Not used: a slash command resolves to an attach chip, not a prompt, so it cannot carry the contract cleanly |
| Host skill or `AGENTS.md` | Agent | Outside the extension. Strongest autonomous discovery; recommended as a small follow-up |

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
