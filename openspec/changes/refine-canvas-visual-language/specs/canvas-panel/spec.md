## MODIFIED Requirements

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

## ADDED Requirements

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
