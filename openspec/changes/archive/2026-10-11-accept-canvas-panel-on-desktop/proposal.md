# Canvas native desktop acceptance

## Why

Canvas has tests, packaged examples and MCP Chromium render evidence. None proves
the installed panel works in the native desktop client. Operator approval is now
recorded, while detailed native-check evidence remains separately identified.

## Scope and status

**Status: operator visual/native approval recorded on 2026-10-11.** Detailed
installation/version and native scenario evidence remain unrecorded. Review the installed panel on a named Canvas
and desktop-client version. No new component, browser service or behavior is
proposed. This acceptance-only change uses `skip_specs: true`.

Check host theme, conversation/ancestor selection, controls, empty/error handling
and file read-only behavior. Record results in `evidence.md`, distinguishing the
native review from the existing [MCP evidence](../../../../extensions/canvas/VERIFICATION.md).
Confirmed defects need a scoped behavior delta or a separate fix change.

## Recovery

Retain the prior installed extension and canvas backup. Restore that installation
if necessary without deleting authored canvases. Installation and grants follow
the [package README](../../../../extensions/canvas/README.md). Do not reinstall or
change host state solely to perform this documentation review.
