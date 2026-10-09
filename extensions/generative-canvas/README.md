# Generative Canvas

OpenChamber 2.2.0+ panel/full-page extension for durable dashboards, charts and
interactive quick tools. JSON selects trusted components; it never supplies
JavaScript or HTML. Uses json-render 0.21.0 and OpenChamber SDK 2.2.0.

## Use

Open Canvas from the rail. The host owns its title, expand and close controls.
The extension frame contains only the artifact selector, preview/source toggles
and artifact menu. Selection loads automatically. The menu contains add,
import, rename, export, reset and delete. Deletion requires confirmation.

Use **Add dashboard** for the revenue example or **Add cost explorer** for local
12/24/36-month comparison. Examples are clearly illustrative data, not live
business records. Tables filter/sort locally. Charts, metric trends and responsive
grids render with a dedicated sans-serif visualization hierarchy.

Canvases are shared across projects and sessions. They live permanently at
`/data/.db/openchamber/canvas/<id>.canvas.json`, not in project worktrees or the
installed extension. Rename changes the display title, not the stable filename.
Deleting or reinstalling the extension does not delete the store.

The list refreshes every three seconds while the frame is visible and clean.
New agent files appear automatically, and changed selected files reload.
Unsaved edits and confirmation dialogs pause refresh. Save or discard before
switching artifacts. Source edits validate before preview/save. Save controls
persists the current horizon. Table search/sort is transient. Stale saves/deletes
are rejected with a reload/discard recovery rather than overwriting changes.

## Agent contract

Write a UTF-8 `<name>.canvas.json` directly under `/data/.db/openchamber/canvas`.
Prefer atomic replacement. Include exactly `catalog_version: "1"`, `title`, and
`spec: { "root": "id", "elements": { ... } }`. Elements contain `type`, `props`
and optional `children`. The same JSON schema works across projects.

Build emits `dist/catalog.json`, `dist/examples/cost-explorer.canvas.json` and
`dist/examples/revenue-pulse.canvas.json`. Validate with
`bun scripts/validate.mjs <file.canvas.json>`. Source of truth: `src/catalog.js`.

| Component | Purpose |
| --- | --- |
| Stack, Grid, Card | Vertical layout, responsive 1–4-column grids and sections |
| Heading, Text | Dashboard hierarchy and escaped plain text |
| Metric | Value, optional detail/change and blue/green/amber accent |
| BarChart, LineChart, DonutChart | Labeled bars, shaded trend and distribution |
| Table | Searchable/sortable bounded data table |
| HorizonControl, CostChart | Shared horizon and deterministic upfront + monthly × months |

Catalog 1 remains compatible with 0.1.0 components. Old project files are not
deleted or silently relocated. Import them through the menu to copy them into
the permanent store. Invalid agent files stay visible with an error.

## Build and install

1. Run `bun install --frozen-lockfile`, `bun test`, then `bun run package` here.
2. Install `dist/openchamber-generative-canvas-0.2.0.zip` through OpenChamber Extensions.
3. Review and approve the local service and `/data/.db/openchamber/canvas/**` filesystem declaration.
4. Reload the client to discover the updated Canvas entry.

The SDK file API cannot rename/delete, so an on-demand Node service owns CRUD.
It runs inside the app runtime, binds only loopback, requires the host-provided
bearer token and uses no additional port mapping/container/model service. Its
API accepts only validated Canvas CRUD in the fixed directory. It rejects path
traversal and symlink files and uses atomic writes plus revision checks. Agent
edits outside this service should use atomic writes; cross-process edits are
not a distributed transaction.

**The service is not OS-sandboxed.** OpenChamber runs it with the app user's
filesystem access. The fixed-directory restriction is enforced by this code,
not by the manifest alone. It exposes no shell, arbitrary filesystem, remote
URL, generated-code or model action. The extension no longer requests broad
project-file access. Native Browser and standalone browser MCP are unchanged.

Artifacts are bounded to 60,000 UTF-8 bytes to fit the SDK service body limit,
100 elements, depth 16 and 200 stored artifacts. Structural validation rejects
unknown props/types, actions/expressions/events, invalid graphs, numeric bounds
and malformed table rows. Files larger than the limit fail explicitly.

## Recovery and verification

Back up `/data/.db/openchamber/canvas` with app data. Restore files there without
changing IDs. The store is independent of extension installation and project
deletion. Before an upgrade, retain the prior ZIP/installed directory and data
backup. Reinstalling an old extension never requires deleting authored JSON.

See `VERIFICATION.md` for executed checks and the MCP Chromium/native desktop
boundary. The reference layout and upstream examples inform the implementation,
not a separate mandatory research deliverable. MCP Apps, arbitrary documents
and simulations remain separate future capabilities.
