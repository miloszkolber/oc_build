# Proposal: Confirm the Canvas panel in the native desktop client

## Intent

The current Canvas release is built, packaged and verified in MCP Chromium, but
it has not been accepted in the native OpenChamber desktop client. The operator
is the only person who can confirm the panel behaves correctly in the real
client, and that confirmation is the last open item on the Canvas work.

This change makes that confirmation an explicit, checkable step instead of an
assumption, and records its outcome in the specification that already states the
boundary.

## Scope

In scope:

- Operator review of the installed Canvas panel in the native desktop client.
- Explicit acceptance or rejection, with the observations that justify it.
- Updating [specs/canvas-panel](../../specs/canvas-panel/spec.md) so the
  verification boundary matches reality once acceptance lands.
- The extension reinstall and client reload steps the acceptance run needs.

Out of scope:

- New Canvas components, contracts or behavior.
- MCP Chromium checks, which are already recorded per version in
  `extensions/canvas/VERIFICATION.md`.
- Any change to the browser MCP or the host runtime.

## Approach

The acceptance run is a manual operator review, so the change is tracked as a
gate with defined steps rather than as code work. The operator installs the
current ZIP, reloads the client, and reviews the panel against the checks below.
The result is recorded in the spec delta: on acceptance, the desktop boundary
scenario is modified to state that acceptance happened and on what version; on
rejection, the change stays open with the defects listed as tasks.

## Changes

**Verification boundary in specs/canvas-panel**

- From: Canvas checks are reported as MCP Chromium checks, and a scenario states
  that the change tracking desktop acceptance stays open with its status as
  awaiting operator acceptance.
- To: The same requirement, plus a scenario that records the operator's
  acceptance against a named Canvas version, and a scenario that states what is
  re-checked when the panel is upgraded.
- Reason: The boundary is currently a placeholder that only describes the gap.
- Impact: None on code or images. Documentation only.

## Acceptance checks

| Check | How it is verified |
| --- | --- |
| Panel opens from the rail in the desktop client | Operator observation |
| A conversation's canvas renders with host theme tokens in light and dark | Operator observation |
| Tables, charts and a Mermaid diagram render at a desktop viewport | Operator observation |
| A subagent session shows the top-level conversation's canvas | Operator observation |
| The empty state's request field copies and inserts into the composer | Operator observation |
| The panel never writes the agent's file | Operator observation, plus a file mtime check |
| A missing file shows an empty canvas and invalid JSON shows a non-shifting notice | Operator observation |

## Rollback

Reinstall the previously retained installed directory and restore the canvas
data backup, as described in
[`extensions/canvas/README.md`](../../../extensions/canvas/README.md). No image
or workflow change is involved, so there is nothing to roll back in CI.

## Status

In progress — awaiting operator acceptance. Blocked on the operator's time, not
on repository work.
