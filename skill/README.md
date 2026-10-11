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
- **Canvas covers the full authoring loop.** Resolve the watched conversation, inspect matching catalog/existing content, validate before atomic replacement and verify the actual surface. Local interaction is separated from agent-authored state. The source catalog admits Row and Disclosure children as well as Stack/Grid/Card, correcting the obsolete three-container rule.
- **Charts encode a reading task, not a decoration policy.** Operator-approved technical diagrams do not impose monochrome charts. Color is justified by series, magnitude, highlights or state. Same-measure comparisons need no per-row key. The module distinguishes supported props from renderer changes and links accessibility to exact text/data, not textures everywhere.
- **Discovery has two entry paths.** Workspace advertises Canvas authoring/interaction directly. Design routes conversation visualizations to the same module instead of duplicating its contract or treating the task as a web-page mockup.

## Sources

| Source | Relevance | What it does not establish |
| --- | --- | --- |
| OpenChamber extension SDK documentation (`docs.openchamber.dev/sdk/*`) | Panel surfaces, host API, UI kit and theme tokens | Behaviour of a specific installed extension version |
| The Generative Canvas extension in this repository (`extensions/canvas`) | The concrete catalog, file path and validation rules the module states | That an agent will discover Canvas without being asked |
| OpenChamber's own browser panel versus the `browser` MCP server | The state-sharing and evidence boundary | That either surface is reachable in every deployment |
| Operator-approved Canvas review, recorded in the repository [change history](../openspec/changes/history.md#visual-language-refinement-2026-10-11) | Technical diagram direction, justified chart color and request for complete authoring/interaction guidance | That every agent adopts the guidance or that approved preview bytes are installed |
| [The case for monochrome data visualization](https://medium.com/design-bootcamp/the-case-for-monochrome-data-visualization-53d2c90c6eb8) (Bootcamp, 2026) | Read-vs-scan color rule: quiet default for in-flow reading, color for scanning/monitoring; value for order, distinct marks for categories; semantic hue reinforces labels | Print/editorial examples and WCAG summary, not a Canvas component specification |

## Evidence limits

- The module describes the contract at the time of writing. Catalog versions and component props can change; the extension README is authoritative for the installed build.
- Native desktop acceptance remains an operator check. Nothing here converts standalone-browser evidence into desktop verification.
- The workspace entry advertises Canvas creation, updates, inspection and interaction explicitly and routes to its module. The native skill path resolves to canonical source. This supplies discoverable guidance, not proof that every agent loads or follows it. No model benchmark or forced startup loading is claimed.

## In-repo snapshot note

This directory mirrors the canonical workspace skill collection. Re-sync copies
the master verbatim, then re-applies two transforms: the design-reference
links in `references/canvas.md` become plain text, and host paths become
role names ("configured canvas directory", "local deployment docs"), because
neither the master's relative links nor host-absolute values resolve portably
from this snapshot layout.
