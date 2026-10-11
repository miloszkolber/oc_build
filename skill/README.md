# Workspace: rationale and sources

Maintainer guide for the [workspace skill](SKILL.md). It covers OpenChamber's in-app work surfaces and how agents should use and report them. Executable procedures live in [references/](references/).

## Why this collection exists

The existing collections describe methods (design, engineering, operations, system, writing). This one describes a **product surface**: the panels a user actually opens inside OpenChamber. Canvas, Files, Git and Context share a visual language and a set of behaviours — reading live state, refusing to mutate what they only display, and reporting evidence honestly. Guidance for them had been scattered across extension READMEs and project documents, which agents do not read.

The umbrella gives each workspace module one owner. Detailed modules cover
Canvas, Browser and the agent development sandbox. Files, Git and Context can
gain references when they need agent-facing rules. The sandbox routes builds,
tests and future tool additions to the container. Inventory stays in image source.

## Decisions

- **Umbrella plus references, not one skill per panel.** The panels share the same boundary questions (view versus source of truth, read versus write, evidence surface). One entry routes to the specific module.
- **Canvas module documents the contract, not the renderer.** Component names and the file path are stable; a charting library swap must not invalidate the guidance.
- **Browser module owns the native/standalone split.** This distinction is the most commonly misreported fact in this workspace, so it is stated as a table rather than prose.
- **The module repeats only what an agent needs to act.** Visual tokens, build steps and deployment facts stay with the extension and project documents.

## Sources

| Source | Relevance | What it does not establish |
| --- | --- | --- |
| OpenChamber extension SDK documentation (`docs.openchamber.dev/sdk/*`) | Panel surfaces, host API, UI kit and theme tokens | Behaviour of a specific installed extension version |
| The Generative Canvas extension in `/repo/oc_build/extensions/canvas` | The concrete catalog, file path and validation rules the module states | That an agent will discover Canvas without being asked |
| OpenChamber's own browser panel versus the `browser` MCP server | The state-sharing and evidence boundary | That either surface is reachable in every deployment |

## Evidence limits

- The module describes the contract at the time of writing. Catalog versions and component props can change; the extension README is authoritative for the installed build.
- Native desktop acceptance remains an operator check. Nothing here converts standalone-browser evidence into desktop verification.
- Discoverability is unresolved. Agents have repeatedly failed to use available surfaces unprompted, which is why the Canvas module tells the reader when a canvas is worth writing, rather than assuming the reader knows the panel exists.
