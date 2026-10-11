# Release pipeline specification

## Purpose

The release pipeline is the set of GitHub Actions workflows and monitoring
configuration that discovers upstream releases, builds and checks images, and
publishes them to GHCR. Its contract is that nothing is published without a real
image check, that canonical tags stay immutable, that only the serialized
`latest` job may publish the mutable alias, and that published provenance is
verifiable after the fact.

Source of truth for the workflows themselves: [`.github/workflows/`](../../../.github/workflows/).

## Requirements

### Requirement: Workflow isolation

Each deliverable SHALL be published by a workflow that runs only for the sources
it needs.

#### Scenario: App workflow triggers

- GIVEN a push to `main`
- WHEN the Build workflow's path filters are evaluated
- Then it runs for app image sources, the Rembric plugin and the workflow file
- And it does not run for browser-only or Canvas-only changes

#### Scenario: Browser workflow triggers

- GIVEN a push to `main`
- WHEN the Browser image workflow's path filters are evaluated
- Then it runs for `docker/browser/**` or the workflow file alone

#### Scenario: Canvas workflow triggers

- GIVEN a push or pull request
- WHEN the Canvas extension workflow's path filters are evaluated
- Then it runs for `extensions/canvas/**` or the workflow file
- And it runs on pull requests as well as pushes

#### Scenario: Scheduled and manual runs

- GIVEN a schedule or manual dispatch
- WHEN a workflow is triggered
- Then the Build workflow runs hourly at minute 17 and weekly on Monday at 04:37
- And the Browser workflow runs weekly on Monday at 04:37
- And every workflow accepts manual dispatch

### Requirement: Runner hardening

Every workflow step SHALL minimize the credentials and permissions it carries.

#### Scenario: Checkout hardening

- GIVEN a workflow checks out the repository
- WHEN `actions/checkout` runs
- Then it is pinned to a full commit SHA
- And `persist-credentials` is `false`

#### Scenario: Least privilege

- GIVEN a job runs
- WHEN its permissions are read
- Then each job declares only the permissions it needs
- And the default at workflow level is `contents: read`

### Requirement: Upstream release discovery

The Build workflow SHALL discover every eligible upstream release rather than
building a hardcoded list.

#### Scenario: Discovery output

- GIVEN discovery runs
- WHEN it completes
- Then it emits a build matrix and a count
- And the image job is skipped when the count is zero

#### Scenario: Newest-release rebuild

- GIVEN a push to `main` or the weekly Monday 04:37 schedule fires
- WHEN discovery runs
- Then the newest app release is rebuilt even if a tag already exists

#### Scenario: Release cutoff

- GIVEN an upstream release published before the configured cutoff
- WHEN discovery runs
- Then it is not selected for building

#### Scenario: Bootstrap seed

- GIVEN an empty package cannot grant GHCR pull scope
- WHEN an operator authorizes the bootstrap input
- Then only the initial seed release is published

#### Scenario: Recovery paths

- GIVEN an operator needs read-only or rebuild recovery
- WHEN they dispatch with the matching input
- Then `verify_digest` reconciles a published tag without building or overwriting it
- And `rebuild` republishes an already-published release with the current Dockerfile
- And `release_id` scopes either operation to one release

### Requirement: Canonical tag shape

Published app images SHALL carry a version-scoped canonical tag that never
changes once published.

#### Scenario: Canonical tag

- GIVEN an upstream release with version `2.2.0` and release id `395994070`
- WHEN the image is built
- Then it is tagged `2.2.0-r395994070`

#### Scenario: Immutability

- GIVEN a canonical tag has been published
- WHEN a later job runs
- Then the canonical tag's bytes are not replaced

### Requirement: Latest promotion

Only the serialized `latest` job SHALL publish the `latest` alias, and it SHALL
promote exact registry bytes rather than rebuilding.

#### Scenario: Candidate selection

- GIVEN the `latest` job runs after acquiring its concurrency group
- WHEN it selects a candidate
- Then it selects the highest eligible stable release
- And a prerelease is never a candidate

#### Scenario: Exact promotion

- GIVEN a candidate is selected
- WHEN promotion runs
- Then the exact registry bytes are promoted by digest
- And the canonical tag is not rebuilt

#### Scenario: Concurrency

- GIVEN the `latest` job runs
- WHEN it publishes
- Then it holds a dedicated concurrency group with `cancel-in-progress: false`
- And no other job may publish the alias

#### Scenario: Prereleases excluded

- GIVEN the newest upstream release is a prerelease
- WHEN the candidate is selected
- Then it is skipped and `latest` keeps pointing at the previous stable release

#### Scenario: Failure recording

- GIVEN promotion setup fails
- WHEN the job exits
- Then a setup failure is recorded with the recorded digest rather than silently continuing

### Requirement: Build-origin verification

Every published image SHALL have its provenance verified before and after
publication.

#### Scenario: Pre-push verification

- GIVEN a built image
- WHEN the build step finishes
- Then its labels are inspected and verified against the release version and source commit
- And the image check container runs before publication

#### Scenario: Post-push verification

- GIVEN an image was just pushed
- WHEN the digest is known
- Then the published manifest, package and repository privacy are verified

#### Scenario: Published-image verification

- GIVEN a published manifest digest
- WHEN verification runs
- Then the image is pulled by digest and its config labels are verified without starting it

#### Scenario: Rename-era images

- GIVEN an image published before the repository was renamed to `oc_build`
- WHEN its source label is verified
- Then the former source URL is accepted as equivalent provenance

### Requirement: Plugin bundle job

A push that touches the Rembric plugin SHALL verify the bundle before any
artifact is retained.

#### Scenario: Bundle verification

- GIVEN the `plugin` job runs on a push
- WHEN the bundle is built
- Then its export contract is checked
- And the notice, licences and digests are placed beside it
- And `dist/build.json` records the build provenance

#### Scenario: Retention failure

- GIVEN the bundle directory is missing after the build
- WHEN the artifact upload runs
- Then the job fails with `if-no-files-found: error`

### Requirement: Extension CI

Canvas changes SHALL pass tests, packaging and example validation before an
artifact is produced.

#### Scenario: Canvas pipeline steps

- GIVEN a Canvas change on a push or pull request
- WHEN the Canvas workflow runs
- Then it installs with `--frozen-lockfile`
- And it runs `bun test`
- And it runs the package step
- And it validates every emitted example in `dist/examples/`
- And only then does it upload the ZIP artifact

#### Scenario: Pinned toolchain

- GIVEN a workflow installs Bun
- WHEN it runs
- Then the Bun version is pinned explicitly
- And the setup action is pinned to a commit SHA

### Requirement: Artifact retention

Published artifacts SHALL be traceable to the run that produced them.

#### Scenario: Artifact naming

- GIVEN a workflow uploads an artifact
- WHEN it is stored
- Then the name identifies the deliverable and the source commit
- And the retained path is the built output directory

### Requirement: Dependency monitoring

Dependencies and actions SHALL be kept current by Dependabot with scoped update
sets.

#### Scenario: Bun ecosystems

- GIVEN Dependabot configuration
- WHEN it opens pull requests
- Then it covers `/extensions/canvas` and `/docker/browser` weekly
- And each directory is limited to five open pull requests
- And each commit message carries a directory-specific prefix

#### Scenario: Actions

- GIVEN Dependabot configuration
- WHEN it opens pull requests for GitHub Actions
- Then it covers the repository root weekly with a `deps(actions)` prefix
- And merging one keeps the SHA-pinned actions current

#### Scenario: Merge path

- GIVEN a Dependabot pull request is merged
- WHEN CI runs
- Then the normal tests and the package step run, so an update cannot land unverified

### Requirement: Known reproducibility limits

The pipeline SHALL document that its builds are not bit-reproducible.

#### Scenario: Recorded metadata

- GIVEN a build completes
- When it is recorded
- Then the source revision and the deployed image IDs are recorded alongside the release
- And the documentation states that mutable base and dependency resolutions prevent bit-reproducibility
