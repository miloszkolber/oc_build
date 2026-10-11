# Like-for-like conversation preview — 2026-10-11

The supplied screenshots compared different artifacts and different theme tokens.
Native Canvas remains the authoritative visual direction. Its CSS was not edited.

## Inputs

Conversation artifact:
`/data/.db/openchamber/canvas/ses_edcc27679ffer6jLb9pJBgVkjS.canvas.json`.
This existing file matches the screenshot heading and content. It remains intact.
Its metric counts are illustrative authored values, not current verification
statistics. Current implementation checks are in `extensions/canvas/VERIFICATION.md`.

Host preferences select Cursor Light and Cursor Dark, with `system` UI font and
`system-mono`. Captured the actual running host's guest-ready theme object in
MCP Chromium through the Canvas host component's memoized ready context. Saved
only `theme.mode` and `theme.tokens`. No URL token, session data or credentials
were copied. Both current and alternate React contexts were checked when changing
the emulated system color preference, to avoid capturing the stale light context.

The snapshots are in `extensions/canvas/preview/host-themes.js`. They include
surface colors, alpha borders, text aliases, fonts, radius and syntax tokens.
They are not approximated from the screenshot. Preview fixture defaults now use
these snapshots rather than a synthetic white/blue palette.

## Matched preview

`/conversation.html` loads `production/index.html`, copied from the packaged
Canvas. Its parent has only a full-size iframe, no toolbar or component CSS.
The JSON is copied verbatim after validation with `--conversation-file`.
The review parent sends it through SDK `file-read` replies and rejects writes.
The default mode is light. `?theme=dark` uses captured Cursor Dark.

Build through `sandbox run -- bun scripts/preview.mjs --build-only
--production-panel --conversation-file <conversation-path>`.
The existing preview service on port 8805 serves the rebuilt output.

## Evidence and limits

55 tests passed with 316 assertions. The copied artifact validates. In MCP
Chromium the matching heading and content render, both diagrams render, writes
are zero, and page horizontal overflow is zero at the inspected viewport.
Computed metric surface is `rgb(242, 242, 242)` and primary is `#2567A8`, matching
the host light snapshot. Font stack is the exact host stack, not `sans-serif`.

The current remote Chromium system-font resolution is still monospace. This is
a browser-environment defect already distinguished in previous verification,
not a reason to recolor or change native Canvas. Matching source CSS/tokens is
verified. Identical native glyph rendering is not claimed. The user should review
the URL in the same client/browser environment as Canvas, or separately authorize
deployment of the browser font repair. No host service was restarted here.

These are static review snapshots. A subsequent host theme or font preference
change requires recapture before claiming parity with that new configuration.

Byte equality checks passed for the source conversation, copied preview JSON and
JSON served over HTTP. Artifact SHA-256:
`86847c6e26c2e346164188223600d3c3b0b26777cf8438749337af94fccddf64`.
Preview JS and CSS are byte-equal to the installed panel. JS SHA-256:
`642db3866fbfbb9b7162899333c40db3ba9fc26044fc016076c29840d0c2d48e`.
CSS SHA-256: `ad0720d19f3ddf7f2e1c4faa36a78b1e8f4cc40ca1e1d1bac3b1f07ae8ed8128`.
Dark mode at 535 × 900 measured the expected `#232323` metric surface and
`#4c9df3` primary, two ready diagrams, zero page overflow and zero writes.
Documentation validation passed 48 files and pinned strict OpenSpec validation
passed eight items. `git diff --check` was clean.
