---
name: "workspace"
description: "Use OpenChamber workspace surfaces and agent development containers: build/test tools, sandbox storage and headless browser CLI, Files/Git/Context, and the native desktop browser."
---

# Workspace

## Core approach

- Treat the workspace panels as the user's view of real state. Read the owning panel before claiming what a user sees.
- Separate the panel from the mechanism behind it. The desktop browser panel and the sandbox browser CLI are different surfaces.
- Keep evidence honest. A sandbox screenshot is not the desktop client; say which surface was checked.
- Change one module at a time and verify it in the surface the user actually opens.

## Select a procedure

| Procedure | Use for |
| --- | --- |
| [Browser](references/browser.md) | Sandbox browser CLI commands, private-network policy, and native desktop evidence limits |
| [Sandbox](references/sandbox.md) | Container builds, tests, dependencies, tool additions and persistent versus temporary storage |

## Boundaries

- Real state lives outside the panel: conversations and projects on disk under the deployment's data directories. The panel is a view, not the source.
- Never present sandbox browser output as the native desktop panel. Tabs, cookies and login state are not shared.
- Importing a module here does not grant network, shell or model authority. Reporting and file access follow the extension's approved scope.
- Panels that write files must write atomically and preserve unrelated content. Read-only panels must not mutate the source they display.
