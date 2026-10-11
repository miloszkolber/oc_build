# Agent sandbox

## Purpose

Provide container-owned development toolchains, reusable package caches and
run-scoped temporary state without requiring new development tools on the host.
Source and commands: [sandbox package](../../../docker/sandbox/README.md).
Checks: image check, launcher regressions and dated change evidence. Writable
host mounts and rootless Docker grant host-user access, not hostile-code isolation.

## Requirements

### Requirement: Explicit container execution
The launcher SHALL run development commands from a mounted physical working
directory as a non-root identity. It SHALL explicitly select the host Docker
runtime, independently of the caller's Docker environment. Docker commands
inside the container SHALL use only the dedicated rootless socket when available.

#### Scenario: Caller selects another Docker context
- **WHEN** a caller runs a sandbox command with DOCKER_HOST or DOCKER_CONTEXT set
- **THEN** the launcher still selects /var/run/docker.sock explicitly
- **AND** the container receives only the rootless Docker endpoint.

#### Scenario: Unsupported working directory or root identity
- **WHEN** the physical working directory is outside the mounted roots or UID/GID is zero
- **THEN** the launcher rejects the command before creating a container.

#### Scenario: Browser QA of a container dev server
- **WHEN** an agent requests --publish 5173:5173 and starts a server on 0.0.0.0
- **THEN** the server is exposed on host loopback only
- **AND** other ports remain unpublished.

### Requirement: Run-owned temporary state
The launcher SHALL create private per-run HOME, TMPDIR and XDG directories,
propagate command status and stop the named container before deleting scratch.
If container cleanup cannot be confirmed, it SHALL retain scratch for recovery.

#### Scenario: Interrupted command
- **WHEN** the launcher receives TERM during a running command
- **THEN** it removes the named container before removing scratch
- **AND** it returns status 143.

#### Scenario: Abandoned run
- **WHEN** scratch older than 24 hours has no active run lock
- **THEN** cleanup removes its orphan container before deleting that scratch.

#### Scenario: Old active run
- **WHEN** cleanup encounters a locked run older than 24 hours
- **THEN** it preserves both the run and its scratch directory.

### Requirement: Persistent dependency caches
The image SHALL direct Bun, npm, pnpm, Go and uv dependency caches into /cache.
Project dependency trees and authored outputs SHALL remain project-owned.
Docker/BuildKit caches SHALL be owned separately by the rootless daemon.

#### Scenario: Repeated build
- **WHEN** a second run builds the same locked project
- **THEN** the dependency caches from the first run remain available
- **AND** each run has independent temporary state.

### Requirement: Recorded tool ownership
New development tools SHALL be recorded in the sandbox image source, its
README and verification rather than installed globally on the host. Agents
SHALL use the workspace sandbox reference to build and test with those tools.

#### Scenario: Missing development runtime
- **WHEN** an agent needs a runtime absent from the image
- **THEN** it updates the image and checks, rebuilds and verifies the consumer
- **AND** it does not install that runtime on the host.

### Requirement: Reviewed image publication
CI SHALL build and check the image and launcher before publishing. Pull-request
validation SHALL not publish images. Publication SHALL not imply deployment.

#### Scenario: Proposed image change
- **WHEN** a pull request changes docker/sandbox
- **THEN** CI checks the image and launcher without registry publication.
