# Agent sandbox

## Purpose

Provide container-owned development toolchains, reusable package caches and
run-scoped temporary state without requiring new development tools on the host.
Source and commands: [sandbox package](../../../docker/sandbox/README.md).
Checks: image check and dated change evidence. Writable
host mounts grant host-user access, not hostile-code isolation.

## Requirements

### Requirement: Explicit container execution
Development commands SHALL run through the deployment's Compose service as a
non-root identity, from a mounted working directory. The sandbox container
SHALL NOT receive a Docker endpoint, socket or the Docker CLI. Docker is a
host-installed tool: container builds and Docker commands run on the host.

#### Scenario: Run a development command
- **WHEN** a caller runs the sandbox service with a command
- **THEN** the command runs as the deployment's non-root UID/GID
- **AND** it starts in the mounted working directory passed to the run
- **AND** the container is removed when the command exits
- **AND** the command's exit status is the caller's exit status.

#### Scenario: Caller selects another Docker context
- **WHEN** a caller has DOCKER_HOST or DOCKER_CONTEXT set
- **THEN** the container still receives no Docker endpoint, socket or CLI
- **AND** the host's Docker socket is not exposed to the container.

#### Scenario: Unsupported working directory or root identity
- **WHEN** a command starts outside the deployment's mounted roots, or the service is invoked with a root identity
- **THEN** the service still runs as its pinned non-root UID/GID
- **AND** paths outside the mounted roots are not visible to the command.

#### Scenario: Browser QA of a container dev server
- **WHEN** a caller publishes a port for a server bound to 0.0.0.0
- **THEN** the port is published on host loopback only
- **AND** no other port is published.

### Requirement: Run-owned temporary state
Each run SHALL receive a private temporary filesystem. Temporary files SHALL
not persist between runs or survive container removal, and the sandbox SHALL
not require host-side scratch directories, locks or stale-run scanning.

#### Scenario: Interrupted command
- **WHEN** a run is interrupted
- **THEN** its container and temporary filesystem are removed
- **AND** no run-owned scratch remains on the host.

#### Scenario: Abandoned run
- **WHEN** a run ends without a clean exit
- **THEN** no run-owned host scratch exists to clean up
- **AND** any leftover container is removed with standard Docker tooling.

#### Scenario: Old active run
- **WHEN** a long-running command is still active
- **THEN** it keeps its own private temporary filesystem
- **AND** no cleanup process can disturb another run.

### Requirement: Persistent dependency caches
The image SHALL direct Bun, npm, pnpm, Go and uv dependency caches into /cache.
Project dependency trees and authored outputs SHALL remain project-owned. The
sandbox SHALL NOT own Docker or BuildKit caches.

#### Scenario: Repeated build
- **WHEN** a second run builds the same locked project
- **THEN** the dependency caches from the first run remain available
- **AND** each run has independent temporary state.

### Requirement: Recorded tool ownership
New development tools SHALL be recorded in the sandbox image source, its
README and verification rather than installed globally on the host. Agents
SHALL use the workspace sandbox reference to build and test with those tools.
Container-image build tooling is out of scope for this image: a task that needs
to build or run containers uses host-installed Docker directly, not the sandbox.

#### Scenario: Missing development runtime
- **WHEN** an agent needs a runtime absent from the image
- **THEN** it updates the image and checks, rebuilds and verifies the consumer
- **AND** it does not install that runtime on the host.

#### Scenario: Container build requested inside the sandbox
- **WHEN** a task needs Docker, compose or buildx
- **THEN** it runs the host-installed tooling on the host runtime
- **AND** the sandbox image is not extended with container-engine tooling.

### Requirement: Reviewed image publication
CI SHALL build and check the image before publishing. Pull-request validation
SHALL not publish images. Publication SHALL not imply deployment.

#### Scenario: Proposed image change
- **WHEN** a pull request changes docker/sandbox
- **THEN** CI checks the image without registry publication.
