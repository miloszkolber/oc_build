# Rembric plugin

## Purpose

Adapt Rembric's session protocol to OpenCode V2 hooks so recall reaches model requests and session reporting works without adding an OpenChamber guest service.

Source: [V2 adapter](../../../extensions/rembric/index.ts) and vendored [protocol](../../../extensions/rembric/core/rembric-plugin-core.mjs). Commands/configuration: [README](../../../extensions/rembric/README.md). Build check: `plugin` job in [build.yml](../../../.github/workflows/build.yml). That check verifies export shape, not end-to-end lifecycle behavior.

## Requirements

### Requirement: Standalone V2 plugin
The bundle SHALL export `rembric.lifecycle` as an OpenCode V2 `{ id, setup }` plugin with no runtime package dependencies.

#### Scenario: Bundle contract
- **WHEN** CI builds and imports the bundle
- **THEN** its default `id` is `rembric.lifecycle` and `setup` is a function
- **AND** vendored MIT protocol files remain unmodified and notices/licences accompany the bundle
- **AND** it is installed through OpenCode, not OpenChamber's extension registry

### Requirement: Transient recall context
The adapter SHALL inject recall/nudges into model system context rather than appending them to persisted user messages.

#### Scenario: Cached and resumed context
- **WHEN** a session prompt/context hook runs
- **THEN** available context is built or reused per session and pushed into that model request
- **AND** a cache miss rebuilds context, compaction invalidates it, and `REMBRIC_INJECT_ALWAYS=1` refreshes per turn
- **AND** recall failure is best-effort and does not break the model request

### Requirement: Session reporting
The adapter SHALL report known non-subagent sessions and flush summaries at the lifecycle boundaries it receives.

#### Scenario: Transcript and idle events
- **WHEN** assistant text ends for a message ordinal
- **THEN** finished text is accumulated in ordinal order and upserted idempotently
- **WHEN** idle or execution-success events arrive
- **THEN** an idle flush is scheduled and turn reporting is deduplicated until a new prompt

#### Scenario: Scope and teardown
- **WHEN** a session-created event's directory lookup identifies a different project or fails
- **THEN** that event does not register the session with this instance
- **AND** context hooks also reject that directory mismatch or lookup failure
- **AND** sessions marked as subagents are skipped
- **WHEN** compaction or disposal occurs
- **THEN** summaries are flushed, with disposal best-effort rather than a guaranteed acknowledged save

Successful directory lookup with no directory is accepted. Prompt hooks register sessions without this directory check. Do not describe the adapter as providing unconditional cross-project isolation.

### Requirement: Explicit configuration and degradation
The adapter SHALL resolve project/server configuration from its documented inputs and disable hooks when the protocol reports missing required values.

#### Scenario: Defaults and project override
- **WHEN** no server variable is supplied
- **THEN** the adapter uses its built-in legacy fallback, not a missing-server error
- **AND** portable deployments explicitly set `REMBRIC_SERVER_URL` to their own Rembric origin
- **AND** `.rembric` project selection takes precedence over the environment fallback and `default`

#### Scenario: Disabled protocol
- **WHEN** the API token, server origin or project slug is missing after resolution
- **THEN** setup logs the disabled reason and returns without registering hooks

### Requirement: Traceable build artifact
CI SHALL retain the standalone bundle with its digest and recorded build provenance.

#### Scenario: Upload
- **WHEN** the push-only plugin job succeeds
- **THEN** notices, `SHA256SUMS` and `build.json` accompany the bundle in a commit-named artifact retained for 30 days
- **AND** the recorded API version is a build declaration, not proof of compatibility with every later OpenCode version

Runtime acceptance requires checking registration and actual recall/reporting on a running OpenCode/Rembric pair. Rollback is a backed-up bundle/notice file swap.
