# Proposal: Visual QA and file handoff

## Intent

Core can present data to an agent and can browse with a standalone Chromium, but
it has no path for the review loop a designer actually runs: point at a real
application, capture what it looks like, hand the resolved HTML and CSS to a
design file, edit there, and get the result back into source.

This change is the first step of that path. It adds an opt-in frontend runner
and a pinned file-mode design tool, then runs the real application's existing
browser and performance suites so the handoff is measured rather than assumed.

## Scope

In scope:

- An opt-in frontend runner used only for this work.
- A pinned OpenPencil CLI and macOS app, MIT licensed, as the file-mode trial.
- Running the target application's existing browser and performance suites.
- Importing resolved HTML and CSS, reopening and exporting, and recording
  font, layout and component losses.
- A desktop and mobile inspection in light and dark.

Out of scope:

- Any always-on service, canvas-to-session bridge or point-at-live-app picking.
  Those are later phases and remain unauthorized.
- Reversible visual tuning, which needs the bridge to exist first.
- A Penpot trial, which is conditional on Doop and OpenPencil leaving durable
  collaboration unmet.
- Changes to the published images or the browser MCP.

## Approach

Two boundaries make this safe. First, the runner is opt-in and scoped to this
work: it is not a new always-on tool, and it is not a build runner inside the
browser MCP. Second, everything happens in the target application's own
repository, so a failure is contained to that worktree.

The measurement is the point. Import resolved HTML and CSS, close and reopen the
file, export it, and compare. Losses in fonts, layout and components are
recorded as evidence, because "it imported" is not a result.

## Changes

**Phase P2 in explorations/visual-coding-phases.md**

- From: P2 is written as a phase contract with scope, success criteria and
  rollback, and is explicitly unauthorized to start.
- To: P2 moves into this change as an authorized, scoped piece of work with
  tasks and acceptance checks. The exploration keeps a pointer to it.
- Reason: Authorization is the only thing separating a phase contract from a
  change. This proposal is that authorization request.
- Impact: One exploration section becomes a pointer; one change folder is added.

**No change to specs/visual-coding**

- From: The spec states that point-at-element feedback remains future work and
  that the browser MCP is not a build or test-framework runner.
- To: Unchanged. This change adds an opt-in runner outside the browser MCP,
  which is consistent with both statements.
- Reason: Recording the relationship now prevents a later reader from assuming
  this change widened the browser MCP.
- Impact: None.

## Acceptance checks

| Check | How it is verified |
| --- | --- |
| The target application's browser suite passes in the runner | Run `bun run test:browser` in the application repository and capture the result |
| The target application's performance suite passes | Run `bun run test:performance` and capture the result |
| Desktop and mobile inspect cleanly | Inspect both at light and dark and record the viewports used |
| Resolved HTML and CSS import without part of the page going missing | Import, then compare against the live page |
| Reopen and export preserve what was imported | Close, reopen, export, and compare |
| Losses are recorded, not tolerated silently | List every font, layout and component loss with its observed impact |

## Operator decisions required

| Decision | Why it is needed |
| --- | --- |
| Which real application is the acceptance target | The suites and the import test have to run against something real, and the operator owns that choice |
| The macOS and file-sharing steps | OpenPencil runs as a macOS app, and the operator's host supplies the sharing path |
| Whether the runner stays available after this change | It is opt-in and scoped; a standing need would be a separate change with a named consumer |

## Rollback

Remove the scoped wrapper and test changes from the application repository.
Preserve the original `.fig` and HTML. Restore the application's prior version if
the imported formats differ from what it expects. The design trial is stopped by
removing it; nothing in this repository's published artifacts depends on it.

## Status

Paused. Needs authorization. This proposal is the authorization request, and the
phase contract in
[`explorations/visual-coding-phases.md`](../../explorations/visual-coding-phases.md)
describes what each later phase would add.
