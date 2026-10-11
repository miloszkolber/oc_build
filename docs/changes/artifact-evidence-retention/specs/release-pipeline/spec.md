# Delta for release-pipeline

## ADDED Requirements

### Requirement: Disposable evidence retention

A retention pass SHALL clean only declared disposable evidence directories,
SHALL be bounded by both age and size, SHALL preserve authored data and
operator-selected exports, and SHALL report what it removed.

#### Scenario: Declared directories only

- GIVEN a retention run
- WHEN its scope is read
- Then it applies only to directories declared as disposable evidence
- And a marker file planted outside those directories survives the run

#### Scenario: Authored data preserved

- GIVEN a canvas file, a lockfile and a design file in their real locations
- WHEN a retention run executes
- Then all three survive

#### Scenario: Age bound

- GIVEN an artifact older than the configured age bound in a disposable directory
- WHEN a retention run executes
- Then it is removed
- And the removal is reported

#### Scenario: Size bound

- GIVEN a disposable directory larger than the configured size bound
- WHEN a retention run executes
- Then the oldest artifacts are removed until the directory is within the bound
- And each removal is reported

#### Scenario: Operator-selected exports preserved

- GIVEN the operator moved an artifact into a durable location or marked it as selected
- WHEN a retention run executes
- Then it survives, even when its neighbors in the disposable directory are removed

#### Scenario: Non-blocking

- GIVEN a retention run
- WHEN it executes
- Then it runs to completion and reports
- And it never blocks other work, and never waits on a service or an interactive prompt

#### Scenario: No silent removal

- GIVEN a retention run removes artifacts
- WHEN it finishes
- Then it lists what it removed and the reason for each removal

#### Scenario: No always-on service

- GIVEN the retention pass
- WHEN its trigger is read
- Then it runs on demand or on a schedule
- And it does not require a resident service, a queue or a database
