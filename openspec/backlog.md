# Deferred work and ownership

These entries preserve useful direction without pretending a design has been
approved. Start a change only when its scope and authority are settled.

| Area | State | Next evidence or decision |
| --- | --- | --- |
| Canvas desktop acceptance | Accepted 2026-10-11 | [Acceptance evidence](changes/archive/2026-10-11-accept-canvas-panel-on-desktop/evidence.md). Operator-reported approval; detailed native checks explicitly waived |
| External OpenCode integration | Next investigation | Inventory actually advertised tools. Native app flags do not prove injection into externally managed OpenCode |
| Base-image updates | Maintenance gap | Dependabot covers Bun packages and Actions, not Docker base versions. Weekly image rebuilds refresh mutable layers but do not detect major-version drift. Choose a mechanism only for a demonstrated need |
| Native search | Disabled host feature | [Projection blocker and acceptance](references/runtime.md#search-projection-blocker). Requires a supported pre-serialization reader and rollout authorization |
| Disposable evidence cleanup | Deferred | Establish disposable paths and operator-approved limits before adding cleanup. Never remove authored data or selected exports |

## Visual tooling direction

These phases remain paused. Existing Doop and native OpenChamber surfaces are
preferred. Prior tool surveys were source reviews, not usability or license
guarantees. Recheck current capabilities and terms only when a concrete need arises.

| Phase | Acceptance boundary | Rollback |
| --- | --- | --- |
| Visual QA/file handoff | Operator selects a real app and sharing path. Run that app's existing browser/performance suites. Trial pinned OpenPencil file mode. Measure import/reopen/export losses in fonts, layout and components at desktop/mobile, light/dark | Remove scoped runner/test edits. Preserve original design and HTML files |
| Doop-to-session bridge | Bind selected frames/comments/screenshots to the correct repository, worktree, session and source revision. Cover late responses, reloads, switches and revision conflicts | Disable bridge and export bindings. Tools remain independent |
| Point-at-live-app | Add only a missing bounded selection/source adapter. Test scrolling, zoom/DPR, navigation, reused components, stale selectors and inaccessible frames. Label unknown mappings. No universal DOM-to-AST promise or production source overlay | Remove dev instrumentation. Navigation/capture continue |
| Reversible tuning | Token-backed CSS/text/layout preview with Reset and reviewed Apply to code. Remove overrides, reload and check responsive/keyboard/error states. Preserve the target framework | Discard experiment changes only |
| Durable collaboration | Consider Penpot only if Doop/OpenPencil leave durable libraries/comments or collaboration unmet. Prove restart persistence, intended-board access, export and backup/restore. Inventory external calls | Export documents, retain backup, stop trial stack |

Do not add an always-on orchestrator, Redis, duplicate HTML canvas or proprietary
editor SDK to solve an unspecified gap. Tool-specific adapters need a real
consumer. Snapshot HTML is not live component identity. Retain the target's
anti-framing policy and keep design, preview and Git histories distinct.
