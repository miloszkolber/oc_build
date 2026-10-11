# Visual tooling survey

Tools reviewed for the visual coding work, with their disposition. Past source
reviews were not usability or production-readiness tests, so recheck current
versions, licenses and self-hosting claims before adopting anything here.

Adoption rule: adopt one only against a concrete unmet need. A tool with no
current consumer is not adopted, however good it is.

## Dispositions

| Tool or group | Disposition |
| --- | --- |
| Doop | Existing provisional solo-plus-agents surface, AGPL-3.0. Keep the stable HTML, MCP, REST, screenshots, comments and token plumbing, and stay fork-ready. |
| OpenPencil | Settled primary file-mode trial, MIT. P2P rooms are not durable server storage. Verify current comment and self-hosting capabilities before relying on them. |
| Penpot | Conditional MPL-2.0 collaboration evaluation. Its multi-service stack must earn its maintenance cost. |
| Onlook | Later bounded Next.js and Tailwind reference or spike. Not assumed to be turnkey or Core-local. |
| Puck, Plasmic, Gissen | Only on demonstrated composition need. Prefer embeddable Puck over another platform. Plasmic licensing differs under `platform/`. Gissen needs a Vue consumer. |
| UICanvas, GrapesJS, Webstudio, Excalidraw | No duplicate HTML canvas. GrapesJS only for a demonstrated Doop gap. Webstudio is not the collaboration backend. Excalidraw is optional for flows and wireframes. |
| Vibepin, React Grab | Annotation spike before custom picking. React Grab only for a real React consumer. |
| Loupe, Stagewise, screenshot-to-code | UX reference, a bounded later comparison, or a prototype utility. Not another orchestrator. |
| Agentation, tldraw, Frontman, Dyad, bolt.diy | Not approved foundations. PolyForm Shield, restricted production use, supplementary-term or telemetry review, restricted pro features with duplicate flows, or WebContainers terms constrain them respectively. Recheck current terms before reconsidering. |
| Subframe, Paper, Cursor, Codex, v0, Claude, Figma | Capability references, not open-source deployment candidates. |
| Excalidraw-based canvases, including whiteboard, mcp_excalidraw and Drawhaus | Reviewed and not adopted. No duplicate HTML canvas. |
| LikeC4 and Structurizr | Reviewed and not adopted for architecture modeling. No demonstrated need. |
| D2, Kroki and Mermaid | Reviewed for diagrams. Mermaid is already used by the Canvas extension; D2 and Kroki add nothing for the current use. |
| annotate-mcp and React Grab | Reviewed for review feedback. Held as spikes, not adopted. |
| Penpot and OpenPencil for design documents | Reviewed. OpenPencil is the file-mode trial; Penpot stays conditional. |

## Why these are notes and not decisions

A disposition is a reading of a tool at a point in time, not a commitment. The
review here was source reading, not a usability test, and none of these tools was
run against a real Core workload except the ones already in use.

When a concrete unmet need appears, the response is a change proposal with a
named consumer, not a re-read of this table. This file exists so the second
review starts from the first one's conclusions instead of repeating it.
