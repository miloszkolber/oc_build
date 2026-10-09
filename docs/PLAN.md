# OpenChamber roadmap

## Roadmap and status

| Priority | Item | Status | Success criteria |
| --- | --- | --- | --- |
| P0 | Chats/workspace initialization | Complete | |
| P0 | Simple Compose | Complete | |
| P0 | Minimal app feature dependencies | Complete | |
| P0 | Detect intentional home Git checkout | Complete | |
| P1 | Standalone browser QA | Complete | |
| P1 | Remove custom extension and prefer native desktop browser | Complete | |
| P1 | Upstream environment audit and redeploy both services | Complete | |
| P1 | Consolidate docs/remove archive file | Complete | |
| P1 | Actual desktop/LAN acceptance | Complete — operator accepted | |
| P1 | Independent app/browser builds | Complete — CI publication verified | Verified Google public cache fixes runner HTTP429. App CI37994072146 and browser CI37994072071 pass checks/publication; app provenance/privacy/latest promotion pass. Both local restricted builds and 42 tests pass. No new credentials or services. |
| P1 | Generative UI canvas extension | 0.8.1 installed — desktop acceptance pending | Read-only panel; Mermaid `Diagram`; subagent sessions show the parent canvas; empty state shows a copyable agent request; no toasts; readable type. Confirm native desktop appearance and behavior. |
| P1 | External-agent native feature integration | Pending | Inventory native tools actually advertised to external OpenCode; add only missing scoped integration, without assuming managed-child injection or duplicating browser control. |
| P2 | Visual QA/OpenPencil handoff | Paused | Real app chosen; desktop/mobile/light/dark suites pass; import/reopen/export records fidelity losses. macOS/file-sharing steps supplied. |
| P3 | Doop canvas/comment-to-session bridge | Paused | Selected HTML/comments/actual image reach correct repository/worktree/session; reload/conflict/switch safety. |
| P4 | Point-at-live-app feedback | Paused | Bounded DOM/style/source context; scroll/zoom/navigation/stale references/frames tested; unknown mappings labelled. |
| P5 | Reversible visual tuning | Paused | Token-backed previews undo/reset/apply to source; reload/accessibility checks; preserve unrelated work. |
| P6 | Penpot collaboration trial | Conditional / paused | Only on unmet need; real co-editing/persistent comments, board isolation, export and backup/restore. |
| Later | Bounded evidence retention | Pending, non-blocking | Age/size cleanup preserves authored data and selected exports. |

## Clarifications

- P2–P6 require fresh operator authorization. Complete rows are not a deployment diary.
- Codex/Cursor parity means usable QA, source-aware feedback, reversible edits and native workspace operations, not identical implementations or another orchestrator. Prefer the native desktop panel and its supported annotations/Web actions; the custom Agent Browser extension stays removed. Native agent integration remains an acceptance item, not a claim of desktop verification.
- `browser` controls standalone Chromium, not native Preview/terminal/sessions/worktrees. Do not assume shared state/desktop visibility. Distinguish MCP Chromium evidence from actual desktop checks.
- Enable native desktop browser/workspace actions with `agentWebToolEnabled=true`, `agentControlToolEnabled=true` and `browserProvider=builtin`. Keep standalone MCP independent. Do not assume managed-child plugin injection into external OpenCode.
- Temporary login and 30-minute idle expiry remain settled. Keep bearer auth and destination restrictions; private/LAN targets need approved grants.

## Documentation owners

| Owner | Content |
| --- | --- |
| `/home/core/docker/openchamber/README.md` | Host runtime, identical host/container paths, credentials, operation, recovery and verification |
| `docs/PLAN.md` (this file) | Roadmap, priorities, clarifications and documentation owners |
| `docs/EXPLORATION.md` | Tool research and Generative UI findings/review |
| `/repo/oc_build/extensions/canvas/README.md` | Canvas catalog, agent/file workflow, build/install and verification boundary |
| `/repo/oc_build/docs/visual-coding.md` | Parity matrix, P2–P6 acceptance/rollback, choices, safeguards and references |
| `/repo/oc_build/docker/openchamber/README.md` | Minimal-image contract and checks |
| `/repo/oc_build/docker/browser/README.md` | Supported QA workflow, limits and resource behavior |
| `/home/core/agents/AGENTS.md` | Always-loaded routing/evidence boundary |
