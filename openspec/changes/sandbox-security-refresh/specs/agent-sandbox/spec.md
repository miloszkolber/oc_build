## ADDED Requirements

### Requirement: CDP origin behavior
The sandbox browser engine SHALL retain its host validation and accept native CDP clients without an Origin header. The engine SHALL accept its own HTTP origin by default and reject unrelated origins unless explicitly configured by the operator.

#### Scenario: Unrelated browser origin
- **WHEN** a CDP WebSocket request carries an unrelated Origin and no origin override is configured
- **THEN** the engine rejects the request.
