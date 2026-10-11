# Native desktop acceptance evidence

## 0.9.16 installation — 2026-10-11

Per operator order, the approved visual source is installed as Canvas 0.9.16 at
`/data/.db/openchamber/extensions/generative-canvas/` from this branch's build
(59 tests, 334 assertions; 118-file ZIP).

ZIP SHA-256:
`04fbfedc176ad7404650536e088703978a818d6c101bb5e6c1fbe7cc25e1b00b`.
Panel main bundle SHA-256:
`27f5d11db4a4b55e8f60b1ec85733c9c785910287db79b42dd2b8e0678244979`.

Installed copy is recursively identical to `dist/` (excluding the ZIP).
Manifest authority is identical to the 0.9.15 backup. Backup:
`/data/.db/openchamber/extension-backups/generative-canvas-0.9.15-final/`.
No authored canvas was touched (approved artifact hash unchanged) and no
service was restarted. The client must be reloaded to discover the new version;
the desktop-client version is therefore still unrecorded here.

## Operator approval — 2026-10-11

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

## Operator approval — 2026-10-11

The operator explicitly states: “Okay, visual+native gets the approval,” with
chart color allowed when justified, and requests complete agent-facing Canvas
interaction guidance. This closes the operator approval gate for the reviewed
result. It is operator-reported native acceptance, not an assistant-executed
desktop test. No desktop-client version, native screenshots or per-scenario
results were supplied in this sign-off. Tasks 1.1–1.6 remain unexecuted/unrecorded
as detailed checks, not evidence of withheld approval.

Latest reviewed visual source is `bbd1e41`, now released and installed as
0.9.16 (see above); installed/preview parity holds for this build. Approval does
not authorize further installations. Release
and installation parity remain separate from the accepted visual/native direction.

## Operator confirmation after install order — 2026-10-11

On the install order the operator confirms: “Approved, works well. Rendered
visual language was only issue to solve.” This re-affirms the visual/native
approval above after reviewing the rendered result. It remains
operator-reported acceptance: no desktop-client version, native screenshots or
per-scenario results were supplied. Tasks 1.1–1.6 stay unexecuted as detailed
checks and are explicitly waived by this approval, not silently dropped.

## Earlier evidence gap at candidate installation

Desktop-client version is unknown. The advertised browser tools control
standalone Chromium, not the native client. No native screenshot or actual host
font/theme check had been obtained at this stage. Task 1.1 remains open
because it also requires the desktop-client version. Tasks 1.2–1.6 remain open.

For reproducible native verification of an installation, reload the actual client,
record its version and follow `tasks.md` with an owned disposable probe canvas. Record native
screenshots, conversation/ancestor selection, composer insertion without send,
local controls, empty/error recovery and unchanged authored file hashes/mtimes.
Record operator approval explicitly. Do not use MCP Chromium evidence to check
these native boxes.
