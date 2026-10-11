## MODIFIED Requirements

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
- **THEN** six patterns cycle against five automatic ramp fills, giving distinct pairs within the 30-entry catalog limit
- **AND** the legend repeats that mark
- **AND** explicit semantic tone overrides remain authored choices, not unique series colors
