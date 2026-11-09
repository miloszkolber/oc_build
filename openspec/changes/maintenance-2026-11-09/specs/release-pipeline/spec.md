## MODIFIED Requirements

### Requirement: Complete eligible release discovery
App discovery SHALL enumerate eligible releases without silently truncating a matrix or interpreting registry authorization failure as an absent image.

#### Scenario: Eligibility and recovery
- **WHEN** discovery runs normally
- **THEN** it applies the cutoff/asset/version rules, skips verified completed releases and emits a matrix/count
- **AND** zero candidates skip the image job
- **WHEN** explicit bootstrap is authorized
- **THEN** its exceptional seed is release `395994070` / `2.0.1` only

#### Scenario: Deliberate rebuild
- **WHEN** a relevant push or weekly rebuild runs
- **THEN** the newest eligible stable release may be rebuilt
- **AND** manual `rebuild` requires an explicit release ID
- **AND** prepare rechecks version/asset identity before building

#### Scenario: Rolling upstream canary
- **GIVEN** a release tagged exactly `canary` and marked as a prerelease
- **WHEN** release discovery enumerates it
- **THEN** it skips that rolling non-versioned release without blocking versioned candidates
- **AND** other malformed non-versioned tags still fail validation

#### Scenario: Rolling model prereleases
- **GIVEN** a prerelease tagged with a non-versioned name such as `asr-models`
- **WHEN** release discovery enumerates it
- **THEN** it skips that rolling artifact without blocking versioned candidates
- **AND** a malformed stable tag still fails validation
- **AND** a malformed `v`-prefixed prerelease still fails validation
