# Release pipeline

## Purpose

Discover eligible upstream releases, build/check independent deliverables and
publish traceable artifacts while separating publication from host deployment.

Source: [workflows](../../../.github/workflows/),
[release discovery](../../../docker/openchamber/releases.mjs),
[latest promotion](../../../docker/openchamber/latest.mjs),
[Dependabot](../../../.github/dependabot.yml).
Checks: [release tests](../../../docker/openchamber/releases.test.mjs),
[latest tests](../../../docker/openchamber/latest.test.mjs) and image checks.
No GitHub publication is established by running local unit tests.

## Requirements

### Requirement: Scoped workflow triggers
Workflows SHALL build only their configured deliverables for relevant source changes.

#### Scenario: Trigger matrix
- **WHEN** workflow events are evaluated
- **THEN** the following configured behavior applies

| Workflow | Source trigger | Schedule (UTC) | Artifact |
| --- | --- | --- | --- |
| Build | `main` pushes matching app/Rembric paths | Hourly `:17`, Monday `04:37` | App image and push-only plugin artifact |
| Browser | `main` pushes matching browser paths | Monday `04:37` | Browser image |
| Sandbox | Matching pushes to `main` and pull requests | Monday `04:23` | Checked sandbox image; pull requests do not publish |
| Canvas | Matching pushes to `main` and pull requests | None | Extension ZIP |
| Documentation contracts | Matching pushes to `main` and pull requests | None | Local checker/tests and upstream strict validation |

All five accept manual dispatch. App/browser workflows have no pull-request
trigger. Do not infer pre-merge coverage for their dependency updates.

### Requirement: Least-privilege automation
Jobs SHALL use SHA-pinned actions, credential-free checkout and scoped permissions.

#### Scenario: Build authority
- **WHEN** a job checks out source
- **THEN** `persist-credentials` is false and action references are full commit SHAs
- **AND** package write access belongs only to publishing jobs, with default `contents: read`

### Requirement: Complete eligible release discovery
App discovery SHALL enumerate eligible releases without silently truncating a
matrix or interpreting registry authorization failure as an absent image.

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

### Requirement: Canonical app tag identity
App publication SHALL identify upstream release/version with `<version>-r<releaseId>` tags.

#### Scenario: Ordinary completion and rebuild
- **WHEN** an already verified release is found in normal polling
- **THEN** it is skipped
- **WHEN** an explicit/forced rebuild is selected
- **THEN** the same canonical tag may receive newly built bytes
- **AND** a digest, not that tag alone, identifies an immutable artifact

### Requirement: Checked app publication
App publication SHALL verify the built image before pushing and verify the
published digest/provenance afterward.

#### Scenario: Publication sequence
- **WHEN** an app candidate builds
- **THEN** its labels identify source revision and upstream release, and the real image check passes before push
- **AND** the pushed manifest digest, expected public package/repository visibility and pulled config labels are verified afterward
- **AND** the former repository source URL remains accepted for rename-era images

#### Scenario: Read-only recovery
- **WHEN** `verify_digest` is dispatched with release ID and original source commit
- **THEN** recovery checks the recorded published artifact without rebuilding or overwriting it

### Requirement: Serialized stable latest promotion
Only the app `latest` job SHALL promote the highest eligible stable app candidate
to `latest` using the exact verified registry manifest bytes.

#### Scenario: Promotion
- **WHEN** the dedicated non-cancelling concurrency group is acquired
- **THEN** candidate selection excludes prereleases and rechecks retained provenance
- **AND** promotion uses the selected digest without rebuilding the canonical image
- **AND** setup/promotion failures are reported instead of treated as success

### Requirement: Independent browser publication
Browser publication SHALL use its own build context and pass its real image
check before pushing version/commit and latest tags.

#### Scenario: Browser build
- **WHEN** its workflow runs on `main`
- **THEN** `<package-version>-<source-commit>` and `latest` are published after the image check
- **AND** app release discovery, privacy reconciliation and serialized app promotion are not implied for this separate pipeline

### Requirement: Checked extension artifacts
Canvas and Rembric SHALL pass their declared local build contracts before CI retains artifacts.

#### Scenario: Canvas package
- **WHEN** the Canvas workflow runs
- **THEN** frozen install, tests, packaging and every emitted example's validation precede ZIP upload
- **AND** its artifact name is `openchamber-generative-canvas`, not a commit-suffixed name

#### Scenario: Plugin package
- **WHEN** the push-only plugin job runs
- **THEN** release/latest/entrypoint checks and the plugin export contract run
- **AND** the commit-named plugin artifact includes digest/provenance and fails upload if files are absent

### Requirement: Scoped dependency monitoring
Dependabot SHALL propose weekly Bun and Actions updates for its configured directories.

#### Scenario: Update scope
- **WHEN** Dependabot evaluates configuration
- **THEN** it covers Canvas/browser Bun dependencies (five open PRs each) and root Actions (ten)
- **AND** package dependencies remain exactly pinned
- **AND** Docker base-version bumps are not covered by this configuration

Image builds resolve mutable base/package inputs and are not bit-reproducible.
Record source revision and deployed digests for recovery. Publication alone is
not rollout, native-client acceptance or a passing host integration check.

### Requirement: Documentation contract validation
Documentation CI SHALL check the single planning tree with local structural
checks and the pinned upstream OpenSpec validator.

#### Scenario: Reviewable failure
- **WHEN** a relevant push or pull request changes docs or implementation
- **THEN** local link/scenario/metadata checks, their regression tests and upstream
  `validate --all --strict` must pass
- **AND** a missing scenario or implicit no-delta change fails instead of being accepted as complete

#### Scenario: One planning home
- **WHEN** OpenSpec resolves the repository's planning files
- **THEN** the physical `openspec/` directory contains the specifications and project configuration
- **AND** validation creates no second copy of the specifications
- **AND** structural success does not claim implemented behavior or native-client acceptance

#### Scenario: Reviewed delta archive
- **GIVEN** a completed change with reviewed requirement deltas
- **WHEN** OpenSpec archives it with spec updates enabled
- **THEN** the deltas merge into main specs while unaffected requirements remain
- **AND** the archived change moves out of the active changes list
