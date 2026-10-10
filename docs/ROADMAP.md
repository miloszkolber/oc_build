# OpenChamber roadmap

Status-first. Each area owns its own subtasks. An area is **Done** only when its
work is merged, built and verified; **In progress** means active now; **Next**
means agreed and unblocked; **Paused** means it needs fresh authorization.

Focused references: [visual-coding.md](visual-coding.md) (agent-surface parity
contract), [reliability.md](reliability.md) (runtime boundaries and the disabled
search index).

## Goals

- One self-hosted OpenChamber a solo operator and coding agents share, on one host.
- Native desktop surfaces for browsing, review and agent-presented data.
- Lean, reproducible images whose dependencies are monitored.
- Agents can build, test and verify without hand-holding.

## Areas

### Host runtime and deployment

**Status: Done**

- [x] Session/workspace initialization, shared Chats path and identical host/container paths.
- [x] Minimal app image with the tools the app actually uses (shell, Git, SSH, process list, UID 1000).
- [x] Intentional `/home/core` Git checkout via an exact opt-in; `/repo` stays a non-repository parent.
- [x] Compose kept simple; auth, isolated browser mounts and 30-minute temporary-login expiry preserved.
- [x] Current topology, credentials and recovery documented in the host `docker/openchamber/README.md`.

### Images and publication

**Status: Done**

- [x] Independent app and browser Dockerfiles, build contexts and image checks.
- [x] Both publish to GHCR from GitHub Actions; app provenance/privacy and `latest` promotion verified.
- [x] Runner Docker Hub rate limits resolved with a digest-matched public mirror.
- [ ] Recheck cached base-image availability when base versions change.

### Implement browser MCP (standalone)

**Status: Done**

- [x] Isolated Chromium with 38 tools, bearer auth and destination restrictions.
- [x] Lazy start, idle expiry, one temporary profile; state never shared with the desktop panel.
- [x] Real-image checks: responsive layout, colour preference, navigation, screenshot, auth, policy.

### Implement Canvas panel

**Status: In progress — awaiting desktop acceptance**

- [x] One canvas per conversation, read from `/data/.db/openchamber/canvas/<session-id>.canvas.json`.
- [x] Read-only panel: no JSON exposure, no toolbar, no writing; the agent owns the file.
- [x] Catalog-1 components: layout cards, headings, text, metrics, bar/line/donut charts, table, Mermaid `Diagram`, horizon + cost tools.
- [x] Subagent sessions show the top-level conversation's canvas.
- [x] Empty state offers a copyable/insertable agent request.
- [x] Visuals aligned with the app's own panels; type at the app's 14 px base.
- [x] No extension service or extra process; approved `filesystem` + `sessions` only.
- [ ] Confirm the panel in the native desktop client (operator).

### Workspace agent guidance

**Status: Done**

- [x] `workspace` skill collection in `/home/core/agents/skills/workspace` (umbrella + Canvas and browser modules).
- [x] Collection listed in the shared guidance README.
- [ ] Extend only when a new panel genuinely needs agent-facing rules.

### Dependency monitoring

**Status: Done**

- [x] Exact pins for extension dependencies (Mermaid pinned so upgrades are deliberate).
- [x] Dependabot pull requests for `/extensions/canvas`; merging runs the normal tests and package step.
- [ ] Cover app-image base versions, not only extension packages.

### Development container

**Status: Next**

A build/test image agents can use directly, so a task does not depend on whatever
toolchain happens to be installed.

- [ ] Base image plus the toolchains the build needs (Node/Bun, Docker CLI, Git, ripgrep).
- [ ] Workspace mount and cache directories that survive runs.
- [ ] Documented entry points for build, test and package.
- [ ] CI parity: the same commands pass locally and in Actions.

### Design and visual tooling

**Status: Paused — needs authorization**

- [ ] Visual QA handoff with a real app and import/reopen/export fidelity.
- [ ] Doop canvas/comment-to-session bridge.
- [ ] Point-at-live-app feedback with bounded DOM/style/source context.
- [ ] Reversible visual tuning backed by tokens.

Candidate tools reviewed but not adopted: Excalidraw-based canvases (whiteboard,
mcp_excalidraw, Drawhaus), LikeC4 and Structurizr for architecture, D2/Kroki and
Mermaid for diagrams, Penpot/OpenPencil for design documents, annotate-mcp and
React Grab for review. Adopt one only against a concrete unmet need.

### Native agent integration

**Status: Next**

- [ ] Inventory the tools an externally managed OpenCode actually advertises.
- [ ] Add only missing, scoped integration; do not assume managed-child injection.

### Search indexing

**Status: Paused — deliberately disabled**

- [x] `messageSearchEnabled=false`; sessions and the retained index are untouched.
- [ ] Revisit only with a supported pre-serialization projection. See [reliability.md](reliability.md).

### Evidence retention

**Status: Paused**

- [ ] Age/size cleanup that preserves authored data and selected exports.

## Document owners

| Owner | Content |
| --- | --- |
| `/repo/oc_build/docs/ROADMAP.md` | Goals, areas, status and subtasks (this file) |
| [visual-coding.md](visual-coding.md) | Agent-surface parity contract and phase boundaries |
| [reliability.md](reliability.md) | Runtime reliability boundaries and the search blocker |
| `/repo/oc_build/extensions/canvas/README.md` | Canvas catalog, agent contract, build and install |
| `/repo/oc_build/extensions/canvas/VERIFICATION.md` | Executed Canvas checks and the desktop-acceptance boundary |
| `/home/core/docker/openchamber/README.md` | Host runtime, credentials, operation and recovery |
| `/home/core/agents/AGENTS.md` | Always-loaded routing and evidence boundary |
