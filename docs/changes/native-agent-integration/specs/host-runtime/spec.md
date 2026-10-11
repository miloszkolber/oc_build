# Delta for host-runtime

## ADDED Requirements

### Requirement: External OpenCode capability inventory

The tool and capability surface of the externally managed OpenCode SHALL be
inventoried by a documented, repeatable method, and the inventory SHALL record
the OpenCode version it was taken against.

#### Scenario: Repeatable method

- GIVEN an externally managed OpenCode service
- WHEN the documented inventory method runs against it
- Then it lists the tools and capabilities the service advertises
- AND a second run against the same service returns the same list

#### Scenario: Version recorded

- GIVEN an inventory run
- WHEN its output is recorded
- Then it names the OpenCode version of the service that was queried
- AND an inventory taken against a different version is recorded separately rather than merged

#### Scenario: App flags are not proof

- GIVEN `agentWebToolEnabled`, `agentControlToolEnabled` and `browserProvider=builtin` are enabled in the app
- When the external OpenCode's advertised surface is assessed
- Then those flags are not accepted as evidence of what the service advertises
- AND the inventory records the service's surface and the app's flags as two separate observations

#### Scenario: Read-only observation

- GIVEN an inventory run
- When it executes
- Then it creates, reads and deletes only an owned probe session
- And it changes no configuration and no published artifact

### Requirement: Scoped integration additions

An integration added from the inventory SHALL close a demonstrated gap and
SHALL name the consumer that needs it.

#### Scenario: Demonstrated gap

- GIVEN a proposed integration
- When it is reviewed
- Then the inventory must show the capability is absent from the external service
- And the proposal names the tool and the consumer that needs it

#### Scenario: No injection assumed

- GIVEN a proposed integration
- When its mechanism is reviewed
- Then it does not rely on managed-child plugin injection, because that remains a separate integration boundary

#### Scenario: Minimal addition

- GIVEN a gap is demonstrated
- When the integration is designed
- Then it adds only the missing scoped capability
- And it does not add a service, a daemon or a second orchestrator

#### Scenario: No gap found

- GIVEN the inventory shows no gap for a proposed capability
- When the proposal is reviewed
- Then it is declined rather than implemented speculatively
