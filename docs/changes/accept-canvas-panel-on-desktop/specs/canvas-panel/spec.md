# Delta for canvas-panel

## ADDED Requirements

### Requirement: Desktop client acceptance

The Canvas panel SHALL be confirmed by the operator in the native desktop client
before it is described as accepted, and the accepting version SHALL be named.

#### Scenario: Acceptance recorded

- GIVEN the operator has reviewed the installed Canvas panel in the native desktop client
- WHEN the acceptance is recorded
- THEN the specification names the Canvas version that was accepted
- AND it names the desktop client version it was accepted in
- AND earlier MCP Chromium checks are kept as separate evidence, not as acceptance

#### Scenario: Rejection recorded

- GIVEN the operator finds a defect in the native desktop client
- WHEN the review ends
- THEN the change stays open
- AND each defect becomes a task with a reproduction step and a verification step

#### Scenario: Upgrade re-check

- GIVEN a Canvas version newer than the accepted one is installed
- WHEN the panel is upgraded
- THEN the panel is re-checked in the native desktop client before the acceptance is carried forward

#### Scenario: Acceptance is not a claim about other surfaces

- GIVEN the panel is accepted in the desktop client
- WHEN that acceptance is cited elsewhere
- THEN it is not cited as evidence about the standalone browser MCP, the app image or the host runtime
