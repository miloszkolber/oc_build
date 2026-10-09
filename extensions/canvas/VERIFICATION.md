# Canvas 0.3.0 verification

Current checks on OpenChamber web 2.2.0 are **MCP Chromium**, not native desktop
acceptance. Tests use the production registry and actual panel code.

- 26 Bun tests passed: renderer/schema boundaries, 256 KiB limit, session-file
  derivation (direct safe ids, stable hashed fallback without traversal,
  rejection of missing sessions).
- Production Canvas 0.3.0 ZIP installed through the supported extension API.
  The approval dialog grants only the exact Canvas filesystem declaration —
  no service is requested or running.
- The real host sandbox renders the floating preview/source/menu controls,
  the centered empty state with no conversation and with an empty conversation,
  and the bordered read-only source view.
- A same-origin QA host drives the real SDK with scripted sessions: writing a
  session file as the agent auto-renders it, switching sessions clears the
  previous canvas, invalid JSON keeps the last good rendering with an error,
  and deleting the file returns to empty. Export and clipboard copy use the
  current horizon selection without rewriting the agent file.
- 390×844 light/dark layouts inspected without root horizontal overflow.

The temporary QA host uses the real SDK and the actual approved host file API.
It permits DOM inspection without weakening OpenChamber's opaque production
iframe. Native desktop acceptance is still operator-owned: panel/full-page,
conversation switching, agent-written rendering, export and copy. No transcript
access, MCP Apps transport or live business-data connection is claimed.
Older global artifact files were left on disk untouched and are not displayed.
