# Generative Canvas

OpenChamber 2.2.0+ panel and full-page extension for agent-generated charts,
tables and local quick tools. Uses pinned `json-render` 0.21.0 and a small,
versioned component catalog. No service, model subscription, remote assets or
browser broker. Native Browser and standalone browser MCP stay independent.

## Install and use

1. Run `bun install --frozen-lockfile` and `bun run package` in this directory.
2. In OpenChamber → Extensions, install `dist/openchamber-generative-canvas-0.1.0.zip` (or the absolute `dist` directory visible to the app server).
3. Approve **project files** only. Open Canvas from the rail or its full-page view.
4. Try the cost explorer. Change 12/24/36 months; totals recalculate locally. Table headers sort and the filter searches rows.
5. Ask an agent to write `visualizations/<name>.canvas.json` in the open project. Refresh files, select and load. Refresh/load are explicit; no filesystem polling.
6. Use JSON source or Import JSON for drafts. Invalid input reports an error and retains the previous valid canvas.
7. Export JSON downloads the current horizon. Save snapshot creates a uniquely named new file under `visualizations/`, never overwrites the source. Table search/sort is transient and not exported.

The host SDK owns project file access, approval, confinement and atomic writes.
This extension does not request outside-project filesystem, network, model,
shell, prompt or service access. No project is required for the example/import.
Changing projects clears the canvas, file list and source draft. Late reads are
discarded. A write already submitted remains a host-owned operation, not a
cancellable transaction; wait for save to finish before changing project.

## Agent contract

Write a UTF-8 JSON file with exactly `catalog_version: "1"`, `title` and `spec`.
The spec uses json-render's flat `{ "root": "id", "elements": { ... } }` shape.
Each element has `type`, `props`, and optional `children`. Start from
`dist/examples/cost-explorer.canvas.json`. Build emits `dist/catalog.json` with
the component schemas. Source of truth: `src/catalog.js`.
Validate agent-written files with `bun scripts/validate.mjs <file.canvas.json>`.

| Component | Props | Behavior |
| --- | --- | --- |
| Stack | `{}` | Vertical layout; children allowed |
| Card | `title`, optional `description` | Section; children allowed |
| Text | `text` | Escaped plain text |
| Metric | `label`, `value`, optional `detail` | Summary value |
| BarChart | `title`, optional `unit`, `data: [{label,value}]` | Nonnegative bars and readable values |
| Table | `title`, `columns: string[]`, `rows: scalar[][]` | Local filter/sort |
| HorizonControl | `label`, `initialMonths`, `options: number[]` | One per canvas, shared horizon |
| CostChart | `title`, `currency`, `providers: [{label,monthly,upfront}]` | Deterministic `upfront + monthly × months`; default 12 without a control |

For an agent: “Create a catalog-1 canvas under visualizations using this
extension's catalog and example. Do not generate JS/HTML, event handlers,
bindings, expressions, URLs or actions. Validate with parseArtifact before
loading. Use components already registered in the catalog.”

## Limits and verification

The validator rejects unknown props/types, events/actions/dynamic expressions,
cycles, repeated children, missing/unreachable nodes, mismatched table rows,
non-finite/out-of-range numbers, more than one horizon control, depth over 16,
more than 100 elements and artifacts over 256 KiB. Text is rendered through
React, never `innerHTML`. Generated files remain untrusted data. No HTML/JS
fallback or automatic URL/source-reference fetching is supported.

Run `bun test` then `bun run package`. Browser verification must include actual
controls, invalid-source recovery, reload/export, narrow panel and full-page
layout. MCP Chromium checks do not imply native desktop-client acceptance.

This is a first catalog, not an unlimited app builder. Add deterministic
components for evidenced tools. MCP Apps portability and an isolated arbitrary
document renderer are separate future slices, not capabilities of this MVP.
