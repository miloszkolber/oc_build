# Visual coding and Codex/Cursor parity

## Capability contract

Reuse native OpenChamber and existing OpenCode agents, not a second orchestrator. Prefer the native desktop browser panel for interactive browsing, annotations and OpenChamber Web actions. `browser` MCP remains standalone Chromium, not a desktop attachment. The custom Agent Browser extension has been removed.

| Capability | Direction | Success criteria / boundary |
| --- | --- | --- |
| Codex/Cursor browser QA | Native desktop panel plus separate baked Chromium MCP | Desktop panel supports human browsing, annotations and native Web actions. Verify actual agent integration with external OpenCode. MCP supports independent localhost navigation, interactions, responsive layout/color preference, PNG/PDF and diagnostics without browser installation; it does not share the panel. |
| Native coding workspace | Preview, worktrees, session goals, Changes Walkthrough, actions, terminal, GitHub/Linear and desktop/mobile clients | Real chat initialization, file/repository operations and PTY I/O, not only health. Integrations retain normal credentials/prerequisites. |
| Cursor-style point-at-element feedback | Future bounded source-aware picking | Element/region plus DOM/style/source context reaches the intended session. Cover scrolling, zoom, navigation, stale selectors and inaccessible frames. No universal DOM-to-AST promise. |
| Paper/Subframe canvas | Existing Doop | Editable HTML variants, selected frames, pinned comments/tokens and screenshots routed to the correct repository/worktree/session. Snapshot HTML is not live component identity. |
| Figma Make/v0 iteration | Existing design brief and OpenCode workflow | Grounded alternatives, operator selection, source changes and responsive/accessibility checks against real components. |
| Safe iteration/undo | Worktrees and source diffs | Preserve dirty work, one starting revision, reversible previews and scoped edits. Canvas, preview and Git histories remain distinct. |

## Roadmap contracts

`docs/PLAN.md` owns priority/status. These contracts do not authorize starting paused phases.

| Phase | Scope and success criteria | Rollback |
| --- | --- | --- |
| P2: visual QA/file handoff | Opt-in frontend runner and pinned OpenPencil CLI/macOS app. Run `bun run test:browser` and `bun run test:performance` in `/repo/mewa_ui`. Inspect desktop/mobile and light/dark. Import resolved HTML/CSS, reopen/export, record font/layout/component losses. Operator chooses a real acceptance app and supplies macOS/file-sharing steps. | Remove scoped wrapper/test changes; preserve original `.fig`/HTML; restore app version if formats differ. |
| P3: canvas-to-session bridge | Bind Doop frame/comment context to repository/worktree/session; start read-mostly. One reviewed comment batch arrives with HTML and an actual screenshot. Updated app/diff/before-after evidence visible. Reload and switches cannot misroute late responses; changed revisions prompt on conflict. Prefer editor links over unsafe framing. | Disable bridge; export bindings; Doop/OpenCode remain independent. |
| P4: point-at-live-app | Smallest missing selection/source adapter after P3; optional Vibepin spike. Plain HTML/custom-element/Svelte example, React only for a real consumer. Cover scroll, zoom/DPR, route changes, reused components, stale selectors, reload and inaccessible frames. Label unknown mappings; no production dev overlays/source metadata. | Disable instrumentation/picking; remove dev imports; navigation/capture continue. |
| P5: reversible tuning | Narrow CSS/text/layout previews, Apply to code and Reset, component adapters only as earned. Adjust token-backed spacing/text, undo/reset, apply through agent, remove overrides, reload and verify responsive/keyboard/error states. Preserve `mewa_ui` framework and use its `registry.json`/`registry.schema.json`. | Discard only experiment/worktree changes, not unrelated work. |
| P6: conditional Penpot | Only if durable collaboration/libraries/comments remain unmet by Doop/OpenPencil. Same screen/tokens, two-human editing, pinned threads survive restart, intended-board agent access, export/code handoff, database/assets backup/restore and external-call inventory. Avoid port 4400; evaluate current official Compose/MCP. | Export documents; preserve backup; stop trial stack. |

## Tool choices

Recheck current versions, licenses and self-hosting claims before adoption. Past source reviews were not usability or production-readiness tests.

| Tool / group | Disposition |
| --- | --- |
| Doop | Existing provisional solo-plus-agents surface, AGPL-3.0. Keep stable HTML/MCP/REST/screenshots/comments and remain fork-ready. |
| OpenPencil | Settled primary file-mode trial, MIT. P2P rooms are not durable server storage. Verify current comment/self-hosting capabilities. |
| Penpot | Conditional MPL-2.0 collaboration evaluation. Its multi-service stack must earn maintenance cost. |
| Onlook | Later bounded Next.js/Tailwind reference/spike, not assumed turnkey Core-local. |
| Puck / Plasmic / Gissen | Only on demonstrated composition need. Prefer embeddable Puck over another platform. Plasmic licensing differs in `platform/`; Gissen needs a Vue consumer. |
| UICanvas / GrapesJS / Webstudio / Excalidraw | No duplicate HTML canvas. GrapesJS only for a demonstrated Doop gap. Webstudio is not the collaboration backend. Excalidraw is optional flows/wireframes. |
| Vibepin / React Grab | Annotation spike before custom picking; React Grab only for a real React consumer. |
| Loupe / Stagewise / screenshot-to-code | UX reference, bounded later comparison or prototype utility, not another orchestrator. |
| Agentation / tldraw / Frontman / Dyad / bolt.diy | Not approved foundations. PolyForm Shield, restricted production use, supplementary-term/telemetry review, restricted pro features/duplicate flows, or WebContainers terms constrain them respectively. Recheck current terms before reconsideration. |
| Subframe / Paper / Cursor / Codex / v0 / Claude / Figma | Capability references, not OSS deployment candidates. |

## Safeguards

- Agent shell and project toolchains stay on the host. Browser MCP is not a build/test-framework runner. A future opt-in toolbox needs a current consumer and explicit ownership.
- Keep Chromium separate from home/workspace/credential mounts. No Docker socket. Retain read-only roots, UID 1000, dropped capabilities and the explicitly authorized isolated-browser sandbox exception.
- Keep temporary login and 30-minute idle expiry. Preserve bearer authentication, destination restrictions and target anti-framing policy.
- Authored files/designs/lockfiles keep their durable owners. Disposable profiles/caches do not replace workspace dependencies or backups.
- Record source revision/dirty diff, viewport, browser version and design revision. Match fonts, locale and motion. Keep large logs/images in bounded files, not model context.
- Automatic artifact age/size retention remains non-blocking. Preserve authored data and operator-selected exports.
- Trust integrations with their granted host access. Guest permissions are not an OS sandbox.
- No always-on orchestrator, Redis, universal AST editor or proprietary canvas SDK for P2–P5. Use small extension storage for bindings and filesystem artifacts for evidence.
- Native OpenCode restarts require an approved idle window. Image rollback cannot undo data migrations. Never print tokens, protected service registration or full config into diagnostics.

## References

[OpenCode MCP](https://opencode.ai/v2/docs/mcp-servers), [client](https://opencode.ai/v2/docs/build/client), [plugins](https://opencode.ai/v2/docs/build/plugins), [OpenChamber extensions](https://docs.openchamber.dev/extensions/), [host SDK](https://docs.openchamber.dev/sdk/host/), [native browser](https://docs.openchamber.dev/desktop-browser/), [OpenPencil MCP](https://openpencil.dev/programmable/mcp-server), [SDK](https://openpencil.dev/programmable/sdk/), [collaboration](https://openpencil.dev/programmable/collaboration), [roadmap](https://openpencil.dev/development/roadmap), [Penpot MCP](https://help.penpot.app/mcp/), [self-hosting](https://help.penpot.app/technical-guide/getting-started/docker/), [Cursor browser](https://cursor.com/docs/agent/tools/browser), [visual editor](https://cursor.com/blog/browser-visual-editor).
