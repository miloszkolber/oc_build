# Canvas 0.2.0 verification

Current checks on OpenChamber web 2.2.0 are **MCP Chromium**, not native desktop
acceptance. Tests use the production registry and actual storage/service code.

- 31 Bun tests passed: renderer/schema boundaries plus permanent-store CRUD, revision conflicts, simultaneous saves, invalid-update preservation, traversal/symlink refusal, invalid-file visibility, authenticated HTTP health/CRUD.
- Both independent Docker builds and their restricted image checks passed. App builds without browser input or Chromium packages. Browser builds without app bundle/Git/shell input and exercises real Chromium/auth/policy/38 MCP tools.
- Production Canvas 0.2.0 ZIP installed through the supported extension API, normal approval dialog reviewed local service and exact Canvas filesystem declaration. The real host sandbox rendered the compact selector/menu and cost explorer. Keyboard menu activation created a permanent artifact.
- Rich revenue dashboard inspected at a 540px panel width in dark mode. Grids, metric accents, line/area trend, distribution ring and table were rendered, not static screenshots of a proposed design.
- Final 390×844 light/dark dashboard inspected. Root and preview scroll widths equal 390px. Line-chart axis labels, distribution legend and table remain readable without root horizontal overflow.
- Real-service UI checks passed: blank artifact creation, invalid source rejection without changing the saved file, corrected source save/preview, stable-ID rename, reload, delete cancellation and confirmed deletion of only the QA artifact.
- Atomically agent-written JSON appeared automatically with no Load button. New selected-file revisions reloaded. An external update during an unsaved source edit produced a revision conflict, retained the draft and recovered through Discard.
- Cost controls saved 36 months into the permanent file (VPS €432, home server €372). Export Blob contained the stable filename and 36-month horizon. Export was captured in the QA host rather than claiming a native desktop download.
- App release/latest regression suite passed all 42 tests in Node 22 with a writable temporary directory.

The temporary same-origin QA host uses the real SDK and proxies to the actual
approved extension-service API. It permits DOM inspection without weakening
OpenChamber's opaque production iframe. Additional CRUD/source/reload checks
are recorded with their actual outcomes in `/tmp/opencode/canvas-v2/`.

Native desktop acceptance is still operator-owned. Check the selector/menu,
preview/source, automatic discovery, save/reload, rename and confirmed delete.
No MCP Apps transport, arbitrary generated-code renderer or live business-data
connection is claimed. The service has host-user access and is not OS-sandboxed.
