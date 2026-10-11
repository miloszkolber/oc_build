# Visual coding phases

These are phase contracts, not changes. A phase becomes a change only when it is
authorized, and none of these are. Authorizing a phase means creating a change
folder for it, moving its contract in, and replacing this entry with a pointer.

The contracts do not authorize starting a paused phase, and reading them is not
a decision to build.

## Authorization state

| Phase | Subject | State |
| --- | --- | --- |
| P2 | Visual QA and file handoff | Paused. Proposed as [visual-qa-handoff](../changes/visual-qa-handoff/proposal.md) |
| P3 | Canvas-to-session bridge | Paused. No proposal |
| P4 | Point-at-live-app feedback | Paused. No proposal |
| P5 | Reversible visual tuning | Paused. No proposal |
| P6 | Conditional Penpot | Paused. Conditional on Doop and OpenPencil leaving durable collaboration unmet |

## Phase contracts

### P2: visual QA and file handoff

An opt-in frontend runner and a pinned OpenPencil CLI and macOS app. Run
`bun run test:browser` and `bun run test:performance` in `/repo/mewa_ui`.
Inspect desktop and mobile in light and dark. Import resolved HTML and CSS,
reopen and export, and record font, layout and component losses. The operator
chooses a real acceptance application and supplies the macOS and file-sharing
steps.

Rollback: remove the scoped wrapper and test changes, preserve the original
`.fig` and HTML, and restore the application's prior version if the imported
formats differ.

### P3: canvas-to-session bridge

Bind Doop frame and comment context to a repository, worktree and session, and
start read-mostly. One reviewed comment batch arrives with HTML and an actual
screenshot. Updated application, diff and before-after evidence stays visible.
Reloads and session switches must not misroute late responses, and changed
revisions prompt on conflict. Prefer editor links over unsafe framing.

Rollback: disable the bridge and export the bindings. Doop and OpenCode remain
independent.

### P4: point-at-live-app

The smallest missing selection and source adapter after P3, with an optional
Vibepin spike. A plain HTML, custom-element or Svelte example, and React only for
a real consumer. Cover scroll, zoom and DPR, route changes, reused components,
stale selectors, reload and inaccessible frames. Label unknown mappings. No
production dev overlays and no source metadata in production.

Rollback: disable instrumentation and picking, and remove the dev imports.
Navigation and capture continue unchanged.

### P5: reversible tuning

Narrow CSS, text and layout previews with Apply to code and Reset, and component
adapters only as they are earned. Adjust token-backed spacing and text, undo and
reset, apply through the agent, remove overrides, and reload to verify
responsive, keyboard and error states. Preserve the `mewa_ui` framework and use
its `registry.json` and `registry.schema.json`.

Rollback: discard only the experiment and worktree changes, not unrelated work.

### P6: conditional Penpot

Only if durable collaboration, libraries and comments remain unmet by Doop and
OpenPencil. Same screen and tokens, two-human editing, pinned threads that
survive a restart, intended-board agent access, export and code handoff,
database and asset backup and restore, and an external-call inventory. Avoid
port 4400. Evaluate the current official Compose and MCP options.

Rollback: export the documents, preserve the backup, and stop the trial stack.

## What gates every phase

| Gate | Applies to |
| --- | --- |
| No always-on orchestrator, Redis, universal AST editor or proprietary canvas SDK for P2 through P5 | All phases |
| Small extension storage for bindings, filesystem artifacts for evidence | P3 |
| No production dev overlays or source metadata | P4 |
| Token-backed adjustments only, with a working undo and reset | P5 |
| An explicit unmet need before any new tool is adopted | All phases |
