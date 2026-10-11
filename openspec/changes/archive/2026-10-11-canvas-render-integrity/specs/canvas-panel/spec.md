# Canvas panel deltas

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
- **THEN** each series carries a repeating pattern in addition to its fill
- **AND** the legend uses the same pattern per series
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