# Visual coding specification

## Purpose

This specification is the agent-surface parity contract. It states which
Codex and Cursor capabilities Core offers through native OpenChamber, which are
future work, and which are deliberately out of scope. Its contract is that Core
reuses native OpenChamber and existing OpenCode agents rather than standing up a
second orchestrator, and that every safeguard below holds regardless of which
visual tooling is added next.

Phase-by-phase scope, success criteria and rollback for the unauthorized phases
live in [`explorations/visual-coding-phases.md`](../../explorations/visual-coding-phases.md).
Tool dispositions live in [`explorations/visual-tooling-survey.md`](../../explorations/visual-tooling-survey.md).

## Requirements

### Requirement: Reuse native surfaces

Capability work SHALL extend native OpenChamber and existing OpenCode agents,
not add a second orchestrator.

#### Scenario: Interactive browsing

- GIVEN an agent or operator needs to browse, annotate or act on a web page
- WHEN the surface is chosen
- Then the native desktop browser panel is preferred
- And the standalone browser MCP remains a separate Chromium for independent navigation and diagnostics

#### Scenario: No second orchestrator

- GIVEN a visual capability is proposed
- When its design is reviewed
- Then it does not introduce an always-on orchestrator, a Redis dependency, a universal AST editor or a proprietary canvas SDK for the planned phases

### Requirement: Browser QA capability

Core SHALL provide agent browser QA without requiring a browser installation on
the agent side.

#### Scenario: Desktop panel

- GIVEN an operator browses in the desktop panel
- WHEN the panel is used
- Then it supports human browsing, annotation and native Web actions
- And actual agent integration with an externally managed OpenCode is verified before it is claimed

#### Scenario: Standalone MCP

- GIVEN a coding agent needs independent localhost navigation
- WHEN it uses the browser MCP
- Then it supports interactions, responsive layout and color preference, PNG and PDF capture, and diagnostics
- And it does not share state with the desktop panel

#### Scenario: Removed extension

- GIVEN the former custom Agent Browser extension
- WHEN the current state is described
- Then it is recorded as removed, and its instructions are not loaded for active MCP work

### Requirement: Native coding workspace

Core SHALL offer the native coding workspace features rather than reimplementing
them.

#### Scenario: Available surfaces

- GIVEN the native client
- WHEN its surfaces are inventoried
- Then Preview, worktrees, session goals, Changes Walkthrough, actions, terminal, GitHub and Linear integrations, and desktop and mobile clients are available

#### Scenario: Verification depth

- GIVEN a workspace feature is verified
- WHEN the verification is designed
- Then it exercises real chat initialization, file and repository operations, and PTY I/O rather than only a health check
- And integrations retain their normal credentials and prerequisites

### Requirement: Point-at-element feedback

Point-at-element feedback SHALL remain future work until a bounded
source-aware picking design is authorized.

#### Scenario: Current state

- GIVEN a request for Cursor-style point-at-element feedback
- WHEN it is assessed today
- Then it is recorded as future, bounded, source-aware picking
- And no partial capability is claimed

#### Scenario: Required coverage when built

- GIVEN the capability is eventually authorized
- WHEN its design is reviewed
- Then element or region plus DOM, style and source context must reach the intended session
- And it must cover scrolling, zoom, navigation, stale selectors and inaccessible frames
- And it makes no universal DOM-to-AST promise

### Requirement: Design surface continuity

Existing design surfaces SHALL keep their role rather than being replaced.

#### Scenario: Doop canvas

- GIVEN an existing Doop canvas
- WHEN it is used for design work
- Then it provides editable HTML variants, selected frames, pinned comments and tokens, and screenshots routed to the correct repository, worktree and session
- And snapshot HTML is not treated as live component identity

#### Scenario: Generation tools

- GIVEN a Figma Make or v0 style iteration request
- WHEN it is handled
- Then it uses the existing design brief and OpenCode workflow with grounded alternatives, operator selection, source changes, and responsive and accessibility checks against real components

### Requirement: Safe iteration and undo

Iteration SHALL stay reversible and SHALL not mix unrelated work.

#### Scenario: Reversibility

- GIVEN an iteration loop
- WHEN it runs
- Then dirty work is preserved, one starting revision is recorded, previews are reversible, and edits stay scoped
- And Canvas, preview and Git histories remain distinct

#### Scenario: Rollback boundary

- GIVEN a visual experiment in a worktree
- WHEN it is discarded
- Then only the experiment and worktree changes are discarded, not unrelated work

### Requirement: Toolchain boundary

Agent shell and project toolchains SHALL stay on the host, and a browser MCP
SHALL never act as a build or test-framework runner.

#### Scenario: Host toolchain

- GIVEN a project needs a framework build or a test suite
- WHEN an agent runs it
- Then it runs with the host's own tooling, not inside the browser MCP

#### Scenario: Future toolbox

- GIVEN a future opt-in toolbox is proposed
- WHEN it is reviewed
- Then it needs a current consumer and explicit ownership before it is added

### Requirement: Chromium isolation

Chromium SHALL stay separate from home, workspace and credential mounts.

#### Scenario: Container configuration

- GIVEN the browser container
- WHEN its configuration is reviewed
- Then it has read-only roots, UID 1000, dropped capabilities and an explicitly authorized isolated-browser sandbox exception
- And it exposes no Docker socket

### Requirement: Temporary login window

Temporary login and idle expiry SHALL be preserved, and bearer authentication
and destination restrictions SHALL stay enforced.

#### Scenario: Idle expiry

- GIVEN a browser session
- WHEN thirty minutes of idle time elapse
- Then the temporary profile is removed

#### Scenario: Policy enforcement

- GIVEN a browser request
- WHEN it is made
- Then bearer authentication, destination restrictions and the target anti-framing policy are enforced
- And the settled login window is not shortened to reclaim resources

### Requirement: Durable ownership of authored data

Authored files, designs and lockfiles SHALL keep durable owners, and disposable
profiles or caches SHALL not replace workspace dependencies or backups.

#### Scenario: Storage separation

- GIVEN a browser profile or cache directory
- WHEN it is treated as storage
- Then it is not accepted as a substitute for workspace dependencies or backups

### Requirement: Evidence recording

Visual work SHALL record enough context to reproduce what was seen.

#### Scenario: Recorded context

- GIVEN a visual review
- WHEN it is recorded
- Then it captures the source revision and dirty diff, the viewport, the browser version and the design revision
- And fonts, locale and motion preference are matched

#### Scenario: Bounded artifacts

- GIVEN logs and images from a visual review
- When they are stored
- Then they go into bounded files rather than model context

### Requirement: Non-blocking retention

Automatic artifact age and size retention SHALL stay non-blocking and SHALL
preserve authored data and operator-selected exports.

#### Scenario: Retention behavior

- GIVEN an automatic retention pass
- WHEN it runs
- Then it does not block work
- And it preserves authored data and exports the operator selected

### Requirement: Integration trust boundary

Integrations SHALL be trusted with the host access they were granted, and guest
permissions SHALL not be mistaken for an OS sandbox.

#### Scenario: Permission semantics

- GIVEN an integration with granted host access
- WHEN its permissions are described
- Then the grant is stated plainly
- And guest permissions are explicitly not called an OS sandbox

### Requirement: Native restart discipline

Native OpenCode restarts SHALL require an approved idle window, and image
rollback SHALL not be assumed to undo data migrations.

#### Scenario: Restart gate

- GIVEN a change that needs a native OpenCode restart
- WHEN it is planned
- Then an approved idle window is required

#### Scenario: Migration limit

- GIVEN a data migration
- WHEN rollback is considered
- Then an image rollback is not assumed to undo it

#### Scenario: Secret hygiene

- GIVEN a diagnostic run
- When it is produced
- Then tokens, protected service registration and full configuration are never printed

### Requirement: Agent guidance scope

The workspace agent guidance collection SHALL grow only when a new panel
genuinely needs agent-facing rules.

#### Scenario: Existing collection

- GIVEN the `workspace` skill collection in the host agents directory
- WHEN its contents are reviewed
- Then it holds an umbrella plus Canvas and browser modules
- And it is listed in the shared guidance README

#### Scenario: Extension

- GIVEN a proposal to add agent-facing rules
- When it is evaluated
- Then it is accepted only when a new panel genuinely needs them

## References

- [OpenCode MCP](https://opencode.ai/v2/docs/mcp-servers)
- [OpenCode clients](https://opencode.ai/v2/docs/build/client)
- [OpenCode plugins](https://opencode.ai/v2/docs/build/plugins)
- [OpenChamber extensions](https://docs.openchamber.dev/extensions/)
- [OpenChamber host SDK](https://docs.openchamber.dev/sdk/host/)
- [OpenChamber native browser](https://docs.openchamber.dev/desktop-browser/)
- [OpenPencil MCP](https://openpencil.dev/programmable/mcp-server)
- [OpenPencil SDK](https://openpencil.dev/programmable/sdk/)
- [OpenPencil collaboration](https://openpencil.dev/programmable/collaboration)
- [OpenPencil roadmap](https://openpencil.dev/development/roadmap)
- [Penpot MCP](https://help.penpot.app/mcp/)
- [Penpot self-hosting](https://help.penpot.app/technical-guide/getting-started/docker/)
- [Cursor browser](https://cursor.com/docs/agent/tools/browser)
- [Cursor visual editor](https://cursor.com/blog/browser-visual-editor)
