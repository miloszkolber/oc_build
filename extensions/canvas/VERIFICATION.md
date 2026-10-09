# Canvas 0.5.0 verification

Current checks on OpenChamber web 2.2.0 are **MCP Chromium**, not native desktop
acceptance. Tests use the production registry and actual panel code.

- 27 Bun tests passed: renderer/schema boundaries, 256 KiB limit, session-file
  derivation, and a showcase test asserting every catalog component validates
  and is exercised.
- Production Canvas 0.5.0 ZIP installed through the supported extension API.
  The approval dialog grants only the exact Canvas filesystem declaration — no
  service is requested or running, and the install record has no page surface.
- Preview-only panel: no source toggle, no export, no copy-JSON. The only
  control is a UI-kit menu with **Copy file path**. A rendered canvas shows it;
  an empty canvas shows none.
- Styling uses the host theme tokens end to end (font, radius, borders,
  elevated/muted surfaces, `--oc-*` status colours). A same-origin QA host that
  supplies the full real token set renders light and dark without hardcoded
  colours; 390–440 px shows no overflow.
- The empty state offers **Draft a request for the agent**; clicking it calls
  `host.compose` with the contract, component list and the exact
  `/data/.db/openchamber/canvas/<session-id>.canvas.json` path.
- A same-origin QA host drives the real SDK with scripted sessions: agent file
  writes auto-render, switching sessions clears, invalid JSON banners, and the
  all-component showcase renders.

The temporary QA host uses the real SDK and the actual approved host file API.
It permits DOM inspection without weakening OpenChamber's opaque production
iframe. Native desktop acceptance is still operator-owned. No transcript
access, MCP Apps transport or live business-data connection is claimed.
Older global artifact files were left on disk untouched and are not displayed.
