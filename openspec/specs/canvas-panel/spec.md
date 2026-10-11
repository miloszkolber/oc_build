# Canvas panel

## Purpose

Render agent-authored, catalog-validated data for the selected conversation in
a read-only OpenChamber panel without executing code supplied by the document.

Source: [panel](../../../extensions/canvas/src/panel.jsx),
[catalog](../../../extensions/canvas/src/catalog.js),
[renderer](../../../extensions/canvas/src/renderer.jsx),
[session paths](../../../extensions/canvas/src/session.js).
Commands and component inventory: [README](../../../extensions/canvas/README.md).
Checks: [tests](../../../extensions/canvas/test/), example validator and
[render evidence](../../../extensions/canvas/VERIFICATION.md).

## Requirements

### Requirement: Conversation-scoped file selection
The panel SHALL read the resolved conversation's canvas and discard stale reads
after a session switch.

#### Scenario: Direct session path
- **GIVEN** a safe nonempty session ID
- **WHEN** the panel resolves its file
- **THEN** it reads `/data/.db/openchamber/canvas/<id>.canvas.json`
- **AND** an unusual ID uses the deterministic `session-<16 hex>.canvas.json` fallback from `session.js`

#### Scenario: Ancestor resolution
- **WHEN** session ancestry is available
- **THEN** the panel follows parent links up to eight hops and uses the resolved ancestor file
- **AND** lookup failure falls back to the selected session's file
- **AND** switching clears the previous rendering and invalidates in-flight results

#### Scenario: Refresh
- **WHEN** the panel is visible and a session is resolved
- **THEN** it re-reads on the three-second poll and window focus
- **AND** late reads from a previous selection are discarded

### Requirement: Bounded trusted document
The parser SHALL accept only the versioned Canvas schema within its size and
structural limits.

#### Scenario: Valid artifact
- **WHEN** UTF-8 JSON has `catalog_version: "1"`, `title` and `spec` with `root`/`elements`
- **THEN** trusted catalog components render from their validated props and child graph
- **AND** the generated catalog, request-field vocabulary and examples derive from `catalog.js`

#### Scenario: Rejected artifact
- **WHEN** a file exceeds 256 KiB or has unknown types/props, actions, expressions,
  events, invalid graph links, numeric bounds or malformed table rows
- **THEN** it fails explicitly instead of being partially interpreted
- **AND** Mermaid directives/unsafe input are restricted before rendering with strict security settings

### Requirement: Read-only presentation
The panel SHALL leave authored files unchanged during display and local interaction.

#### Scenario: Local controls
- **WHEN** a user filters/sorts tables, switches tabs or adjusts a planning horizon
- **THEN** only transient panel state changes
- **AND** there is no canvas-write/export/management toolbar or raw-JSON view

#### Scenario: Empty and invalid content
- **WHEN** the selected file is missing
- **THEN** the panel shows an empty state, not a read error
- **WHEN** a file becomes invalid or unreadable
- **THEN** a non-layout-shifting notice appears and the last good rendering for that selection remains

### Requirement: Explicit agent request
The empty state SHALL provide a copyable or insertable request targeting the resolved file.

#### Scenario: User remains in control
- **WHEN** the user copies or inserts the request
- **THEN** it includes the path, document shape and generated component vocabulary
- **AND** insertion appends to the composer without automatically sending

### Requirement: Host-derived visual presentation
Rendering SHALL follow host theme tokens and preserve readable component states.

#### Scenario: Theme and async diagrams
- **WHEN** light/dark tokens change
- **THEN** panel surfaces and Mermaid configuration derive from the host theme
- **AND** diagrams render serially and expose rendering/error states rather than an unexplained blank region

#### Scenario: Selection stability
- **WHEN** a tab, choice or horizon selection changes
- **THEN** state is distinguished without a font-weight-induced layout shift

### Requirement: Minimal extension authority
The manifest SHALL declare only the panel, session capability and scoped filesystem access.

#### Scenario: Install surface
- **WHEN** the extension manifest is inspected
- **THEN** it declares `sessions` and `/data/.db/openchamber/canvas/**`
- **AND** no service, page, model key or network authority is declared
- **AND** host filesystem enforcement, not this panel, owns canonical-path permission checks

Canvas files have a durable owner independent of extension installation. Agents
should replace them atomically and back them up with app data. Native desktop
acceptance remains tracked in the [open change](../../changes/accept-canvas-panel-on-desktop/proposal.md).
