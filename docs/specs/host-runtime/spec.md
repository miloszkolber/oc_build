# Host runtime specification

## Purpose

This specification covers the boundary between the containerized OpenChamber web
app and the natively managed OpenCode service on the host, plus the reliability
limits that follow from it. Its contract is that workspace paths must exist at
the same absolute path in both environments, that the minimal app image still
carries the prerequisites native terminals and integrations need, and that a
known native serialization limit stays explicitly disabled rather than papered
over.

## Requirements

### Requirement: Absolute path parity

Workspace paths SHALL exist at the same absolute path inside the container and
on the host.

#### Scenario: State root

- GIVEN Core's deployment
- WHEN the container and the host are compared
- Then `/data/.db/openchamber` is the state root on both sides
- And `/data/.db/openchamber/chats` is the managed Chats root
- And `/home/core` is the home directory on both sides

#### Scenario: Mounts retained

- GIVEN the container runs
- WHEN its mounts are reviewed
- Then `/home/core` and `/repo` remain mounted

#### Scenario: Container-only state is a defect

- GIVEN the state tree is mounted only under `/home/openchamber/.config/openchamber`
- WHEN that container-only directory is passed to native OpenCode
- Then the setup is rejected, because native OpenCode cannot resolve it

#### Scenario: App-local success is not proof

- GIVEN an app-local filesystem operation succeeds and the server is healthy
- WHEN native workspace bootstrap is assessed
- Then neither event is accepted as evidence that the native workspace bootstrapped

### Requirement: Native bootstrap verification

A deployment change SHALL be verified against the native path, not only against
the container.

#### Scenario: Verification sequence

- GIVEN a verification run
- WHEN it proceeds
- Then it checks `/api/fs/home` first
- And then location, config, form and permission bootstrap scoped to the returned Chats root
- And it creates, reads and deletes only an owned probe session
- And it inspects the UI warning
- And it preserves authored Chats data

#### Scenario: Error interpretation

- GIVEN a `LocationNotFoundError`
- When it is observed
- Then it is not treated as evidence for recursive ownership or permission changes

### Requirement: Minimal image prerequisites

A minimal image SHALL still carry the OS-level prerequisites that native
OpenChamber features depend on.

#### Scenario: Explicit tool exceptions

- GIVEN the app image's distroless Node base
- WHEN its OS tools are inventoried
- Then the only exceptions are Bash and Git, one BusyBox for basic commands and model-archive extraction, SSH for Git remotes, and a real `ps` for terminal process-group cleanup
- And UID 1000 has a passwd and group identity

#### Scenario: Chromium and agent QA excluded

- GIVEN the app image
- WHEN its contents are inspected
- Then Chromium and agent QA are absent, because they belong to the separate distroless browser image

#### Scenario: Feature checks exercise real I/O

- GIVEN a feature is verified
- WHEN the verification runs
- Then it includes real PTY I/O and command execution, not only terminal creation

#### Scenario: Framework prerequisites stay external

- GIVEN a project needs a framework build, a package manager, a local speech model or an external integration credential
- When the app image is assessed
- Then it does not provide them, because they are feature or project prerequisites rather than web-server contents

### Requirement: Native agent feature flags

Enabling the desktop browser and native workspace actions SHALL be configured
through the app's own flags, and SHALL not be assumed to reach an externally
managed OpenCode.

#### Scenario: Flags in use

- GIVEN Core's configuration
- WHEN the relevant flags are read
- Then `agentWebToolEnabled` enables native browser and web actions
- And `agentControlToolEnabled` covers broader native workspace features
- And `browserProvider=builtin` selects the preferred desktop browser panel

#### Scenario: Separation from the standalone MCP

- GIVEN the standalone browser MCP is also connected
- WHEN the two are compared
- Then they are separate browsers with separate state, and enabling the native panel does not change the MCP

#### Scenario: Managed-child injection not assumed

- GIVEN OpenCode is managed externally
- WHEN a settings change is proposed
- Then it is not assumed to inject tools into the external OpenCode, because managed-child plugin injection is a separate integration boundary

### Requirement: Native search projection limit

Native message search SHALL stay disabled until a bounded projection exists,
and the reason SHALL stay documented.

#### Scenario: Indexing behavior

- GIVEN OpenChamber's search indexer
- WHEN it indexes a session
- Then it indexes user text and settled assistant text, with reasoning optional
- And it ignores tool outputs

#### Scenario: Serialization limit

- GIVEN the native message API is used to read a session
- When a record carries large tool state
- Then the API returns the complete record including that state before the caller can discard it
- And an oversized historical record can fail during serialization

#### Scenario: Observed failure

- GIVEN OpenCode 2.0.26 with three historical sessions
- WHEN those sessions are read
- Then assistant reads stall at pages of 100 and of 10
- And one-record paging succeeds on ordinary records and then stalls on another record in the first stream
- And logs show a string-length overflow and transport termination

#### Scenario: Diagnosis

- GIVEN the observed failure
- When it is explained
- Then it is described as a native record-transport problem, not a missing SQLite permission and not simply too-large index batches

#### Scenario: No projection available

- GIVEN the inspected message API
- WHEN its parameters are reviewed
- Then it supports message type, limit, order and cursor
- And it supports no content projection

#### Scenario: Sanitized export is not a fix

- GIVEN a sanitized export
- When it is proposed as a repair
- Then it is rejected, because it redacts the searchable text it would need to restore

#### Scenario: Disabled state

- GIVEN the limit above
- WHEN Core configures search
- Then `messageSearchEnabled` is `false`
- And indexing stops while the database and sessions are preserved

#### Scenario: Prohibited workarounds

- GIVEN the limit above
- WHEN a fix is proposed
- Then deleting historical records, indexing sanitized placeholders, raising memory limits blindly, or calling a reduced page size a complete fix are all rejected

### Requirement: Repair acceptance

The projection repair SHALL meet four conditions before indexing is enabled
again.

| Condition | Required result |
| --- | --- |
| Native bounded projection | Selects user text and assistant text or reasoning before JSON serialization. Excludes tool and provider state without omitting searchable text. Uses a supported API or native reader, not an ad-hoc writable database adapter. |
| Regression | Large tool state plus ordinary searchable text does not overflow transport. Paging retains order and cursors and finds known user and assistant phrases. |
| Rollout | Native data is backed up consistently before any migration. An approved idle window is used if a native service restart is required. Sessions and the search database are preserved. |
| Acceptance | Backfill and live indexing complete without silent skips or placeholder indexing. Search returns expected snippets and session IDs. Ordinary APIs and realtime connections stay stable. |

#### Scenario: Evidence location

- GIVEN the investigation into this limit
- WHEN its artifacts are needed
- Then they are under `/tmp/opencode/openchamber-reliability/`

#### Scenario: Status ownership

- GIVEN the current status of this limit
- WHEN a reader looks for it
- Then the specification and the host runbook state it, and no other file claims to own it
