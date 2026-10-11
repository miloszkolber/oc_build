# Rembric plugin specification

## Purpose

The Rembric plugin maps Rembric's harness-agnostic session protocol onto
OpenCode's V2 plugin API. It registers and reports OpenCode sessions in Rembric
and delivers Rembric's recall context into model requests. Its contract is that
it is an OpenCode plugin rather than an OpenChamber extension, that vendored
upstream code stays byte-for-byte unmodified, and that a missing server or token
disables it quietly instead of failing a session.

Source of truth for build, install and configuration commands:
[`extensions/rembric/README.md`](../../../extensions/rembric/README.md).

## Requirements

### Requirement: Package identity

The plugin SHALL be built and shipped as an OpenCode V2 plugin, and SHALL NOT
appear in OpenChamber's extension list.

#### Scenario: Loading

- GIVEN OpenCode discovers `*.js` files in its plugin directory
- WHEN it loads `rembric.js`
- THEN the plugin registers as `rembric.lifecycle`
- AND no `opencode.jsonc` plugin entry is required

#### Scenario: Not an OpenChamber guest

- GIVEN OpenChamber lists its installed extensions
- WHEN the plugin is deployed
- Then Rembric does not appear in that list
- And OpenChamber's extension install and service-approval flow does not apply to it

#### Scenario: Shared directory is not a relationship

- GIVEN the plugin lives under `extensions/`
- WHEN its runtime relationship is described
- Then it is stated to be a build convenience only, with no runtime relationship to the other packages in that directory

### Requirement: V2 protocol mapping

The plugin SHALL implement OpenCode's V2 hook surface rather than the V1 API
that upstream Rembric ships.

#### Scenario: Context injection

- GIVEN a model request is assembled
- WHEN the `context` hook runs
- Then first-prompt and recall nudges plus daemon-supplied hints are injected as transient system text
- And the injected text is never appended to the user's persisted turn

#### Scenario: Transcript capture

- GIVEN an assistant response completes
- WHEN the `session.text.ended` stream fires
- Then the transcript is accumulated by ordinal so turn reports and summaries carry both sides of the conversation

#### Scenario: Turn reporting

- GIVEN a session becomes idle or an execution succeeds
- WHEN `session.idle` or `session.execution.succeeded` fires
- Then the turn is reported to Rembric

#### Scenario: Summary flushing

- GIVEN a session has produced content
- WHEN an idle debounce elapses or `session.compaction.ended` fires
- Then the summary is flushed
- And a debounce interval is configurable in milliseconds

#### Scenario: Process disposal

- GIVEN OpenCode is shutting down
- WHEN `global.disposed` fires
- Then every known session is flushed fire-and-forget

#### Scenario: Scope

- GIVEN the plugin runs for one directory
- When events arrive
- Then events are scoped to this plugin instance's directory
- And sub-agent sessions are ignored

### Requirement: Vendored code integrity

The vendored Rembric core SHALL stay byte-for-byte upstream.

#### Scenario: Vendored files

- GIVEN the `core/` directory
- WHEN its contents are compared with upstream Rembric
- Then `rembric-plugin-core.mjs` and `rembric-dotenv.mjs` match upstream exactly
- And they are covered by Rembric's MIT licence with attribution in `NOTICE`

#### Scenario: Prohibited edits

- GIVEN a need to change plugin behavior
- When a contributor opens `core/`
- Then the file states that it must not be edited
- And changes are made in `index.ts` instead

### Requirement: Self-contained bundle

The built plugin SHALL have no runtime dependencies.

#### Scenario: Build output

- GIVEN the build command runs
- WHEN it completes
- Then it emits `dist/rembric.js` with both vendored files inlined
- And the default export is a plain `{ id, setup }` object
- And no runtime dependency is required

#### Scenario: Generated output is not source

- GIVEN `dist/` is generated and git-ignored
- When a rollback or rebuild is needed
- Then it is rebuilt from committed source at the chosen revision rather than by editing `dist/`

### Requirement: Quiet degradation

A missing server URL or token SHALL never fail a session.

#### Scenario: Missing configuration

- GIVEN `REMBRIC_SERVER_URL` or `REMBRIC_API_TOKEN` is absent
- When OpenCode loads the plugin
- Then the plugin loads but stays disabled
- And it writes a `[rembric]` line to stderr explaining why
- And no session fails because of it

#### Scenario: Disabling without removal

- GIVEN the plugin file is deployed
- When an operator unsets the token or its environment file
- Then the plugin loads but stays disabled, with no file removal required

### Requirement: Configuration surface

Plugin configuration SHALL come from environment variables with a per-session
override.

#### Scenario: Variables

- GIVEN a configured deployment
- WHEN the variables are read
- Then `REMBRIC_SERVER_URL` names the Rembric origin without an `/mcp` suffix
- And `REMBRIC_API_TOKEN` carries the bearer token
- And `REMBRIC_PROJECT_SLUG` is the fallback project slug
- And `REMBRIC_INJECT_ALWAYS` rebuilds the injected context every turn instead of caching it per session
- And `REMBRIC_IDLE_DEBOUNCE_MS` sets the idle-summary debounce

#### Scenario: Per-session override

- GIVEN a `.rembric` file in the session's working directory
- When the plugin resolves the project
- Then that file's `PROJECT_SLUG` wins over the environment fallback

#### Scenario: Service environment

- GIVEN the OpenCode service is configured
- WHEN it starts
- Then the variables reach it through `EnvironmentFile=/etc/opencode-server/rembric.env`

### Requirement: Build-time verification

The plugin bundle SHALL be verified by its export contract in CI.

#### Scenario: Export contract

- GIVEN the `plugin` job of the Build workflow runs
- WHEN the bundle is imported
- Then its default export has `id` equal to `rembric.lifecycle`
- And `setup` is a function
- And the job fails otherwise

#### Scenario: Provenance record

- GIVEN the `plugin` job runs
- WHEN the bundle is produced
- Then `dist/build.json` records the repository, the source commit, the Bun version, the OpenCode API version, the entrypoint, the runtime kind and the bundle SHA-256
- And `dist/SHA256SUMS` records the bundle digest
- And `NOTICE` and `THIRD_PARTY_LICENSES` are copied beside the bundle

#### Scenario: Artifact retention

- GIVEN the `plugin` job runs on a push
- WHEN it uploads the bundle
- Then the artifact is retained for 30 days
- And the upload fails if no files are found

### Requirement: Runtime load verification

Deployment SHALL confirm the plugin is active rather than assuming the build
contract is enough.

#### Scenario: Active registration

- GIVEN OpenCode is running with the plugin deployed
- WHEN `GET /api/plugin` is queried
- Then `rembric.lifecycle` reports as active

#### Scenario: Version basis

- GIVEN a load-verification claim
- WHEN it is made
- Then it names the OpenCode version and the Rembric version it was verified against

### Requirement: Rollback

A deployed plugin SHALL be replaceable with a file swap.

#### Scenario: Rollback steps

- GIVEN a deployed plugin needs reverting
- WHEN the operator restores the previous `rembric.js` and its notice, or deletes the pair and reloads OpenCode
- Then the previous behavior returns or the plugin is removed entirely
- And rebuilding an earlier revision uses committed source at that revision

#### Scenario: Protocol drift

- GIVEN Rembric warns that its server and plugin APIs can change together
- WHEN either side is upgraded
- Then the protocol is re-checked before the next deployment
