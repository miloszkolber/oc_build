## ADDED Requirements

### Requirement: Headless browser CLI
The sandbox SHALL provide a headless browser for agents through a command-line interface, not an MCP service or separate image. It SHALL pin the engine and its automation library and verify them offline.

#### Scenario: Offline browser smoke test
- **WHEN** the image check runs without network access
- **THEN** `obscura fetch` renders local HTML and `obscura fetch --screenshot` writes a PNG
- **AND** the `browser` CLI prints text and writes a screenshot through the CDP connection
- **AND** `playwright-core` imports successfully

#### Scenario: Private network policy
- **GIVEN** a loopback or private LAN URL
- **WHEN** a caller has not passed `--allow-private-network`
- **THEN** the engine refuses the target
- **AND** the caller can opt in explicitly for local development

#### Scenario: One-shot lifecycle
- **WHEN** a `browser` command completes or fails
- **THEN** its ephemeral engine process exits
- **AND** no browser port is published outside the sandbox
