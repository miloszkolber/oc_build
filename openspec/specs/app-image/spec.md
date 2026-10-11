# App image

## Purpose

Package the upstream OpenChamber web release with the OS prerequisites it uses,
while keeping OpenCode, Chromium and project build toolchains outside the runtime.

Source: [Dockerfile](../../../docker/openchamber/Dockerfile),
[entrypoint](../../../docker/openchamber/entrypoint.sh) and the two strict patches.
Commands: [package README](../../../docker/openchamber/README.md).
Checks: [entrypoint regression](../../../docker/openchamber/entrypoint.test.mjs),
[real image check](../../../docker/openchamber/check-image.mjs).

## Requirements

### Requirement: Verified upstream bundle
The build SHALL install the requested upstream web version and fail if its
bundle version, supplied integrity digest or required patches do not match.

#### Scenario: Version and integrity
- **GIVEN** a version and optional `OPENCHAMBER_ASSET_SHA256`
- **WHEN** the web tarball is downloaded
- **THEN** its package version must match the resolved requested version
- **AND** a supplied SHA-256 must match before extraction
- **AND** omitted digest means no integrity pin, not an implicit verified digest

#### Scenario: Strict patching
- **WHEN** the self-update or home-repository patch no longer matches upstream
- **THEN** zero-fuzz application fails the build instead of shipping silently unpatched

### Requirement: External service readiness
The entrypoint SHALL wait for an external OpenCode `/api/info` response with a
string `version` before serving the web bundle in the foreground.

#### Scenario: Probe and handoff
- **WHEN** the container starts
- **THEN** it probes `OPENCODE_HOST` (default `http://127.0.0.1:4096`)
- **AND** it uses Basic authentication when `OPENCODE_SERVER_PASSWORD` is set,
  with `OPENCODE_SERVER_USERNAME` defaulting to `opencode`
- **AND** after success it execs the CLI at the configured app host/port

#### Scenario: Repeated failed probes
- **WHEN** 60 probes fail
- **THEN** the entrypoint reports failure and exits non-zero without serving
- **AND** failed probes are separated by a one-second delay

The fetch itself has no explicit deadline. Sixty attempts is not a bounded
60-second startup guarantee if a request hangs.

### Requirement: Runtime prerequisites
The image SHALL support native shell/Git/SSH/process operations without a
runtime package manager or bundled Chromium.

#### Scenario: Runtime contents
- **WHEN** the assembled image is checked
- **THEN** Bash, Git and its helpers, BusyBox applets, SSH and `ps` run with their
  required libraries under UID/GID 1000 with a resolvable `core` identity
- **AND** no project package manager or browser is required inside the app image
- **AND** the real-image check exercises PTY output and terminal cleanup, not just CLI health

### Requirement: Exact home checkout opt-in
The image SHALL permit one explicitly named existing home-root Git checkout
without changing filesystem-root or repository-initialization guards.

#### Scenario: Allowed home
- **GIVEN** `OPENCHAMBER_ALLOWED_HOME_REPOSITORY` resolves to the detected home checkout
- **WHEN** repository detection runs
- **THEN** Git features may operate for that checkout

#### Scenario: Other guarded roots
- **WHEN** the opt-in is absent/mismatched or a filesystem root is detected
- **THEN** the existing rejection remains
- **AND** home/root VCS initialization guards remain unchanged

### Requirement: Explicit build dependencies
The build SHALL use its declared base-image sources and retain runtime attribution.

#### Scenario: Base resolution
- **WHEN** a Docker Hub base/frontend resolves
- **THEN** it is pulled through `mirror.gcr.io`, while distroless comes from `gcr.io`
- **AND** a cache miss fails instead of an implicit direct-pull fallback
- **AND** runtime licences accompany copied software

Base tags, apt packages and upstream dependency resolutions remain mutable.
Recheck cache availability on base changes. Release labeling/publication belongs
to the [release pipeline](../release-pipeline/spec.md), not this image contract.
