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

#### Scenario: Local state during refresh
- **WHEN** polling or focus re-reads unchanged content
- **THEN** local control state and diagram DOM remain intact
- **WHEN** compatible authored content changes within the same selection
- **THEN** the chosen horizon remains selected
- **AND** a newly selected conversation or removed horizon option uses the authored initial horizon

### Requirement: Explicit agent request
The empty state SHALL provide a copyable or insertable request targeting the resolved file.

#### Scenario: User remains in control
- **WHEN** the user copies or inserts the request
- **THEN** it includes the path, document shape and generated component vocabulary
- **AND** insertion appends to the composer without automatically sending

### Requirement: Host-derived visual presentation
Rendering SHALL follow host theme tokens and preserve readable component states,
encoding meaning in more than color alone and holding layout while content
changes.

#### Scenario: Theme and async diagrams
- **WHEN** light/dark tokens change
- **THEN** panel surfaces and Mermaid configuration derive from the host theme
- **AND** diagrams render serially and expose rendering/error states rather than an unexplained blank region

#### Scenario: Selection stability
- **WHEN** a tab, choice or horizon selection changes
- **THEN** state is distinguished without a font-weight-induced layout shift

#### Scenario: Diagram render while the panel is not rendered
- **GIVEN** a canvas whose `Diagram` render starts while the guest document is not rendered
- **WHEN** the panel becomes rendered again
- **THEN** the diagram renders without a user action
- **AND** a transient Mermaid measurement failure is retried once rather than stored as a terminal error

#### Scenario: Redundant series encoding
- **GIVEN** a chart component with more than one series
- **WHEN** it renders
- **THEN** series have matching labeled legend marks and textual values
- **AND** sparse patterns distinguish repeated automatic fills beyond the first five series
- **AND** single-series charts stay solid

#### Scenario: Scrollable region stability
- **WHEN** canvas content overflows the panel, a table, a code block or a diagram
- **THEN** scrolling remains available without a reserved scrollbar gutter
- **AND** showing or hiding overflow does not shift surrounding content

#### Scenario: Review surface parity
- **WHEN** the served preview is used to review styling
- **THEN** it resolves typography through the same token chain as the panel
- **AND** host or system font resolution, not a preview-specific family, determines the face

#### Scenario: Focus ownership
- **WHEN** the table filter input receives keyboard focus
- **THEN** exactly one focus indicator is drawn, owned by the search field wrapper

### Requirement: Faithful chart boundaries
Chart geometry SHALL represent validated values without inventing nonzero marks
for zero data or hiding a single observation.

#### Scenario: Zero and tiny distributions
- **WHEN** distribution or stacked data includes zero or tiny positive values
- **THEN** zero values consume no colored arc, width or height
- **AND** tiny positive values keep their proportional geometry without a fixed minimum size
- **AND** an all-zero donut shows only its neutral track and zero total

#### Scenario: Single observation
- **WHEN** a line chart or sparkline contains one observation
- **THEN** it displays a centered mark rather than a nonexistent trend

#### Scenario: Empty gauge and fractional rating
- **WHEN** a gauge's value is zero
- **THEN** it shows its track and value without a progress ring or cap artifact
- **WHEN** a rating is fractional
- **THEN** it draws full stars plus a proportionally clipped partial star instead of rounding or dropping the fraction
- **WHEN** a progress maximum is zero
- **THEN** it reports the value alone rather than a percentage it cannot compute

#### Scenario: Series beyond the ramp
- **GIVEN** a component allows more series than the accent ramp has steps
- **WHEN** the series index exceeds the ramp length
- **THEN** each group of five fills uses the next of six patterns, giving distinct pairs within the 30-entry catalog limit
- **AND** the legend repeats that mark
- **AND** explicit semantic tone overrides remain authored choices, not unique series colors

### Requirement: Readable panel-width layout
Canvas content SHALL adapt to the containing panel width and keep wide data
locally scrollable without forcing the entire canvas to scroll horizontally.

#### Scenario: Narrow panel in a wide host
- **WHEN** the containing canvas is narrower than its layout breakpoint
- **THEN** dashboard columns collapse regardless of the outer host viewport
- **AND** diagrams preserve intrinsic label size through local horizontal scrolling

#### Scenario: Long content and keyboard scrolling
- **WHEN** validated long labels or wide tables, code, diagrams or heatmaps render
- **THEN** ordinary labels wrap within their surfaces
- **AND** wide data regions retain local scrolling and can receive keyboard focus

#### Scenario: Review themes and diagram text
- **WHEN** the review preview or panel receives a theme snapshot
- **THEN** the SDK applies typography and semantic colors using the same path
- **AND** diagram font families bypass color parsing
- **AND** diagram faces, text and meaningful borders derive from host tokens rather than default shadows or inverted library colors

### Requirement: Minimal extension authority
The manifest SHALL declare only the panel, session capability and scoped filesystem access.

#### Scenario: Install surface
- **WHEN** the extension manifest is inspected
- **THEN** it declares `sessions` and `/data/.db/openchamber/canvas/**`
- **AND** no service, page, model key or network authority is declared
- **AND** host filesystem enforcement, not this panel, owns canonical-path permission checks

Canvas files have a durable owner independent of extension installation. Agents
should replace them atomically and back them up with app data. Native desktop
acceptance is recorded in the [archived acceptance](../../changes/archive/2026-10-11-accept-canvas-panel-on-desktop/evidence.md).

### Requirement: Restrained visual encoding
Canvas SHALL use neutral host foreground and surfaces for ordinary controls and
diagram structure, reserving semantic hues for explicit meaning or state.

#### Scenario: Ordinary display controls
- **WHEN** ratings, choices, checklists, steps and timeline dots render
- **THEN** they use monochrome marks with shape, surface and text distinguishing states
- **AND** callouts have no decorative left stripe
- **AND** metric changes occupy the top-right header without overlapping their labels

#### Scenario: Chart textures
- **WHEN** automatic chart series render
- **THEN** the first five fills remain solid
- **AND** sparse patterns distinguish later repetitions of the five-fill ramp
- **AND** legends match chart marks and values remain available as text

#### Scenario: Same-measure comparisons
- **WHEN** BarChart or CostChart compares directly labeled values of the same measure
- **THEN** the bars share one solid fill without category swatches or repeating textures
- **AND** every row exposes its label and numeric value as semantic text
- **AND** lengths keep their common zero baseline and proportional scale

#### Scenario: Technical diagrams versus charts
- **WHEN** structural Mermaid diagrams render
- **THEN** connectors and frames are restrained and labels use consistent host typography
- **WHEN** Mermaid pie charts render
- **THEN** a quiet accent/neutral chart palette may distinguish parts from each other
- **AND** chart labels and structure remain readable without applying UI semantic colors to categories

#### Scenario: Diagram scale
- **WHEN** a Mermaid diagram renders in a wide panel
- **THEN** it does not upscale its intrinsic geometry to fill the card
- **AND** categorical node surfaces are neutral rather than unrelated semantic hues
- **AND** narrow panels preserve readable labels with local scrolling
