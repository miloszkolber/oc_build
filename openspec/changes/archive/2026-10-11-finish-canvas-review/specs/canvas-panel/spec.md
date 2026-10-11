## MODIFIED Requirements

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

## ADDED Requirements

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
