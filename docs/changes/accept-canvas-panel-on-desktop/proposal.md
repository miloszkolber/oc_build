# Canvas native desktop acceptance

## Why

Canvas has tests, packaged examples and MCP Chromium render evidence. None proves
the installed panel works in the native desktop client. Acceptance is still open.

## Scope and status

**Status: awaiting operator review.** Review the installed panel on a named Canvas
and desktop-client version. No new component, browser service or behavior is
proposed. This acceptance-only change uses `skip_specs: true`.

Check host theme, conversation/ancestor selection, controls, empty/error handling
and file read-only behavior. Record results in `evidence.md`, distinguishing the
native review from the existing [MCP evidence](../../../extensions/canvas/VERIFICATION.md).
Confirmed defects need a scoped behavior delta or a separate fix change.

## Recovery

Retain the prior installed extension and canvas backup. Restore that installation
if necessary without deleting authored canvases. Installation and grants follow
the [package README](../../../extensions/canvas/README.md). Do not reinstall or
change host state solely to perform this documentation review.
