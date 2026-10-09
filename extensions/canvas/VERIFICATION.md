# Canvas 0.4.0 verification

Current checks on OpenChamber web 2.2.0 are **MCP Chromium**, not native desktop
acceptance. Tests use the production registry and actual panel code.

- 27 Bun tests passed: renderer/schema boundaries, 256 KiB limit, session-file
  derivation, and a showcase test asserting every catalog component validates
  and is exercised.
- Production Canvas 0.4.0 ZIP installed through the supported extension API.
  The approval dialog grants only the exact Canvas filesystem declaration —
  no service is requested or running, and the install record declares panel
  only (no page surface).
- The real host sandbox renders the icon view-switch plus the UI-kit actions
  menu only while a canvas exists; empty states show no buttons. Empty states
  and error/success notices are UI-kit mounts (`mountEmpty`, `mountBanner`).
- A same-origin QA host drives the real SDK with scripted sessions: agent file
  writes auto-render, switching sessions clears, invalid JSON banners, source
  view, Export/Copy JSON/Copy file path, and the all-component showcase.
- 390×844 light/dark layouts inspected without root horizontal overflow.

The temporary QA host uses the real SDK and the actual approved host file API.
It permits DOM inspection without weakening OpenChamber's opaque production
iframe. Native desktop acceptance is still operator-owned: panel behavior,
conversation switching, agent-written rendering, export and copy. No transcript
access, MCP Apps transport or live business-data connection is claimed.
Older global artifact files were left on disk untouched and are not displayed.
