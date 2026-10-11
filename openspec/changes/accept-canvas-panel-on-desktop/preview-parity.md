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

Before the authorized browser rollout, remote Chromium system-font resolution was monospace. This was
a browser-environment defect already distinguished in previous verification,
not a reason to recolor or change native Canvas. Matching source CSS/tokens is
verified. Identical native glyph rendering is not claimed. The user should review
the URL in the same client/browser environment as Canvas. The later approved
browser-only rollout below resolves the monospace fallback, not native-client acceptance.

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

## Authorized browser-only rollout

The operator approved deployment and browser restart. Published `latest` still
pointed to `sha256:ae12b03d7a50bf90cdfddeab536d39fd1f5829cee0b871385f9d4c9ea7b4696b`,
whose metadata contained only Liberation fonts and no `/etc/fonts/local.conf`.

Built the existing font repair from source revision
`377f22305cf62497bddb58c7f763bd90e281b2d5` through the sandbox's rootless Docker.
The real-image check passed Chromium 154.0.8037.92, 38 MCP tools, auth, policy,
responsive modes and screenshot capture. Added a check that seven UI/generic font
families measure six W glyphs at least 1.5 times wider than six i glyphs.

Loaded the tested image into host Docker and deployed only `openchamber-browser`
with `--no-deps --no-build --pull never --wait`. Candidate image:
`sha256:9a6f90190373969c2cfe27d7ccdc83c58bf516e79601d88bb567ec00e5657417`.
Tag: `openchamber-browser:canvas-font-repair-377f223`.
Host Compose override pins this local candidate and excludes only this browser
from Watchtower until the regular image contains the repair. No source was pushed.

Rollback image tag: `openchamber-browser:rollback-before-canvas-fonts`.
Host runbook owns removal of the temporary override and resumption of the regular
published-image update policy. Browser temporary tabs/cookies were cleared by
recreation. No authored canvas, extension or app container was changed.

The app container ID remained
`1c3804e49c952a698dadac0528a00c64b1b4b067eb2c24dc11218c64574cecc5` and start time
`2026-10-10T03:00:54.410230392Z`. Browser stayed UID 1000, read-only, all capabilities
dropped, no-new-privileges and 512 MiB shared memory. Health reports ready/38 tools.
Native systemd OpenCode browser MCP disconnect/connect returned 204 each, without
a process restart. The coexisting CLI service returned 404 on that optional refresh
route. Its advertised browser tools still executed against the replacement service.

Live preview at 535 × 900 in both modes now renders proportional UI text. Actual
host font stack at 20px measured six W glyphs as 113.8633px and six i glyphs as
28.4659px. Mono measured both as 71.9999px. Both screenshots inspected. Two diagram
SVGs ready, zero page horizontal overflow and zero synthetic writes in both modes.
Colors and packaged JS/CSS were not overridden to compensate for fonts.
