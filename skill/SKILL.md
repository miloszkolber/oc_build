---
name: "workspace"
description: "Use OpenChamber workspace surfaces and agent development containers: build/test tools and sandbox storage, Canvas, Files/Git/Context, and native versus standalone browsers."
---

# Workspace

## Core approach

- Treat the workspace panels as the user's view of real state. Read the owning panel before claiming what a user sees.
- Separate the panel from the mechanism behind it. A Canvas panel reads a session file; the browser panel drives a Chromium instance. Neither is a chat message.
- Keep panel evidence honest. A rendered screenshot in the standalone browser is not the desktop client; say which one was checked.
- Change one module at a time and verify it in the surface the user actually opens.

## Select a procedure

| Procedure | Use for |
| --- | --- |
| [Canvas](references/canvas.md) | Writing or debugging an in-conversation presentation canvas and its component JSON |
| [Browser](references/browser.md) | Native desktop browser panel, annotations, versus the standalone browser MCP and its evidence limits |
| [Sandbox](references/sandbox.md) | Container builds, tests, dependencies, tool additions and persistent versus temporary storage |

## Boundaries

- Real state lives outside the panel: conversations in `/data/.db/openchamber/chats`, canvases under `/data/.db/openchamber/canvas`, projects on disk. The panel is a view, not the source.
- Never present the standalone Chromium MCP as the native desktop panel. Tabs, cookies and login state are not shared.
- Importing a module here does not grant network, shell or model authority. Reporting and file access follow the extension's approved scope.
- Panels that write files must write atomically and preserve unrelated content. Read-only panels must not mutate the source they display.
