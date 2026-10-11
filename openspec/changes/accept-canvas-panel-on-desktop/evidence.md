# Native desktop acceptance evidence

## Candidate installation — 2026-10-11

Canvas 0.9.15 is installed at
`/data/.db/openchamber/extensions/generative-canvas/` from this branch's build.
Source review base: `a47aa88`, followed by the gap-closure change recorded in
`extensions/canvas/VERIFICATION.md`. The final commit is discoverable in Git.

ZIP SHA-256:
`3109274ce10b744b64cbbfa2b3396d64c744d6cf82be7a8c8ee484771ccd83f7`.
Panel main bundle SHA-256:
`642db3866fbfbb9b7162899333c40db3ba9fc26044fc016076c29840d0c2d48e`.

All nine packaged top-level entries compared recursively equal to the installed
copy. The manifest authority is identical to the previous installation. Backup:
`/data/.db/openchamber/extension-backups/generative-canvas-0.9.14-final/`.
No authored canvas was touched and no service was restarted during installation.

## Open operator gate

Desktop-client version is unknown. The advertised browser tools control
standalone Chromium, not the native client. No native screenshot, actual host
font/theme check or operator approval has been obtained. Task 1.1 remains open
because it also requires the desktop-client version. Tasks 1.2–1.6 remain open.

Before sign-off, reload the actual client to discover 0.9.15, record its version,
then follow `tasks.md` with an owned disposable probe canvas. Record native
screenshots, conversation/ancestor selection, composer insertion without send,
local controls, empty/error recovery and unchanged authored file hashes/mtimes.
Record operator approval explicitly. Do not use MCP Chromium evidence to check
these native boxes.
