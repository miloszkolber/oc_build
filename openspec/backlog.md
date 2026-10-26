# Deferred work and ownership

These entries preserve useful direction without pretending a design has been approved. Start a change only when its scope and authority are settled.

| Area | State | Next evidence or decision |
| --- | --- | --- |
| Canvas desktop acceptance | Accepted 2026-10-11 | [Acceptance record](changes/history.md#native-desktop-acceptance-2026-10-11). Operator-reported approval; detailed native checks explicitly waived |
| External OpenCode integration | Next investigation | Inventory actually advertised tools. Native app flags do not prove injection into externally managed OpenCode |
| Base-image updates | Mechanism active 2026-10-13 | A scheduled dependency-maintenance pass, configured by the operator outside this repository, reviews Docker base images, upstream release assets and vendored packages that Dependabot does not cover and keeps a high-water mark. Demonstrated need: [2026-10-13 found Bun and pnpm security drift](changes/history.md#dependency-maintenance-refresh-2026-10-13) |
| Rembric plugin live check | Partially verified 2026-10-26 | The running OpenCode V2 API reports `rembric.lifecycle` active, and a current session is present in Rembric. These observations do not prove prompt injection, turn reporting or flush. The installed bundle differs in SHA-256 from a current-source bundle built with Bun 1.4.4, so establish deployed provenance and exercise those paths in an isolated integration fixture before claiming lifecycle acceptance |
| Legacy session archive | Diagnosed 2026-10-26 | A legacy session's stored location is an inaccessible root-user directory. OpenCode logs `FileSystem.DirectoryAccessDeniedError` for the same session PATCH that returns 500 during app startup. Preserve the session and filesystem permissions. Resolve through the OpenCode session owner without deleting or rewriting session data speculatively |
| Portable runtime defaults | Source limitation | The Rembric adapter still has a deployment-specific origin fallback, and Canvas has a fixed filesystem root and matching manifest grant. Documentation now requires an explicit Rembric origin and refers to the Canvas root symbolically. A separate behavior change must coordinate configuration, permissions and tests rather than pretending those constants are already portable |
| pnpm major refresh | Deferred | Sandbox stays on the 11.x line (11.28.8), which closes the current advisories. Evaluate pnpm 12 only when a consumer needs it |
| Native search | Disabled host feature | [Projection blocker and acceptance](references/runtime.md#search-projection-blocker). Requires a supported pre-serialization reader and rollout authorization |
| Disposable evidence cleanup | Deferred | Establish disposable paths and operator-approved limits before adding cleanup. Never remove authored data or selected exports |

## Visual tooling direction

These phases remain paused. Choose the available design and native OpenChamber surfaces for the target deployment. Prior tool surveys were source reviews, not usability or license guarantees. Recheck current capabilities and terms only when a concrete need arises.

| Phase | Acceptance boundary | Rollback |
| --- | --- | --- |
| Visual QA/file handoff | Operator selects a real app and sharing path. Run that app's existing browser/performance suites. Trial pinned OpenPencil file mode. Measure import/reopen/export losses in fonts, layout and components at desktop/mobile, light/dark | Remove scoped runner/test edits. Preserve original design and HTML files |
| Doop-to-session bridge | Bind selected frames/comments/screenshots to the correct repository, worktree, session and source revision. Cover late responses, reloads, switches and revision conflicts | Disable bridge and export bindings. Tools remain independent |
| Point-at-live-app | Add only a missing bounded selection/source adapter. Test scrolling, zoom/DPR, navigation, reused components, stale selectors and inaccessible frames. Label unknown mappings. No universal DOM-to-AST promise or production source overlay | Remove dev instrumentation. Navigation/capture continue |
| Reversible tuning | Token-backed CSS/text/layout preview with Reset and reviewed Apply to code. Remove overrides, reload and check responsive/keyboard/error states. Preserve the target framework | Discard experiment changes only |
| Durable collaboration | Consider Penpot only if Doop/OpenPencil leave durable libraries/comments or collaboration unmet. Prove restart persistence, intended-board access, export and backup/restore. Inventory external calls | Export documents, retain backup, stop trial stack |

Do not add an always-on orchestrator, Redis, duplicate HTML canvas or proprietary editor SDK to solve an unspecified gap. Tool-specific adapters need a real consumer. Snapshot HTML is not live component identity. Retain the target's anti-framing policy and keep design, preview and Git histories distinct.
