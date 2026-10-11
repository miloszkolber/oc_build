# Delta for release-pipeline

## ADDED Requirements

### Requirement: App image base version monitoring

The app image's base versions SHALL be monitored on a schedule against their
upstream sources, with digest comparison, without automatic bumping.

#### Scenario: Pinned versions read from source

- GIVEN the app image Dockerfile
- WHEN the monitoring check runs
- Then it reads the base versions the image actually pins
- AND changing a pinned version in the Dockerfile changes what the check reports

#### Scenario: Digest drift detected

- GIVEN a recorded digest for a pinned base version
- WHEN the current digest differs
- Then the check fails and names the version, the recorded digest and the current digest
- AND it does not modify the Dockerfile or open a pull request

#### Scenario: No automatic bump

- GIVEN a drift report
- When an operator reviews it
- Then the bump is a separate deliberate change, consistent with how extension dependencies are pinned so upgrades are deliberate
- AND the monitoring check itself never writes to a build input

#### Scenario: Cache miss fails explicitly

- GIVEN the check resolves a base version through the `mirror.gcr.io` cache
- WHEN the cache is unavailable
- Then the check fails with an explicit error
- AND it does not silently fall back to a direct Docker Hub pull

#### Scenario: Schedule and dispatch

- GIVEN the monitoring workflow
- WHEN it is triggered
- Then it runs on a weekly schedule
- AND it accepts manual dispatch with the same check

#### Scenario: Browser image excluded

- GIVEN the monitoring workflow
- When its scope is read
- Then it covers the app image's base versions only
- AND the browser image's base versions are covered by its own weekly rebuild, not duplicated here
