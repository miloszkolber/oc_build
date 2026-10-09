# Canvas verification

Current checks on OpenChamber web 2.2.0 are **MCP Chromium**, not native desktop
acceptance. Tests use the production registry and actual panel code.

## 0.7.0

- 28 Bun tests passed: renderer/schema boundaries, 256 KiB limit, session-file
  derivation, showcase coverage (every catalog component, now including
  `Diagram`), diagram input rejection (script/event markup, `javascript:`,
  front-matter config, `%%{init}%%` directives) and the earlier checks.
- Production Canvas 0.7.0 ZIP installed through the supported extension API.
  The approval grants the exact Canvas filesystem declaration and the
  `sessions` capability; there is still no service and no page surface.
- Mermaid is bundled as lazy chunks (main stays small; `panel/chunks/*` load
  only when a canvas contains a `Diagram`). Verified in MCP Chromium that both
  a flowchart and a sequence diagram render, with node fill/text following the
  host theme, and that they re-render on a light/dark switch.
- Subagent sessions show the parent's canvas: with a scripted child session
  whose `parentId` points at the top-level conversation, the panel read the
  parent's file and rendered it. The panel is a read-only presentation with no
  chrome; raw JSON is never shown; the empty state still drafts an agent
  request, now targeting the resolved file.
- 390–440 px light/dark layouts inspected without root horizontal overflow.

A QA finding worth keeping: a host that omits a theme token can leave the
literal string `"undefined"` in the custom property. The diagram theme reader
treats `""`, `"undefined"` and `"null"` as missing and falls back, rather than
passing a bad colour to Mermaid.

The temporary QA host uses the real SDK and the actual approved host file API.
It permits DOM inspection without weakening OpenChamber's opaque production
iframe. Native desktop acceptance is still operator-owned. No transcript
access, MCP Apps transport or live business-data connection is claimed.
Older global artifact files were left on disk untouched and are not displayed.

## Earlier (0.2–0.6)

CRUD service, conversation scoping, UI-kit chrome, the showcase example,
token-based styling and the removal of all panel chrome were each installed and
verified in MCP Chromium before 0.7. Their details are preserved in the
repository history and in `docs/EXPLORATION.md`.
