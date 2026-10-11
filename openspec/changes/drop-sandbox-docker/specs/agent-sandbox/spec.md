## MODIFIED Requirements

### Requirement: Explicit container execution
The launcher SHALL run development commands from a mounted physical working
directory as a non-root identity. It SHALL explicitly select the host Docker
runtime, independently of the caller's Docker environment. The sandbox
container SHALL NOT receive a Docker endpoint or the Docker CLI.

#### Scenario: Caller selects another Docker context
- **WHEN** a caller runs a sandbox command with DOCKER_HOST or DOCKER_CONTEXT set
- **THEN** the launcher still selects /var/run/docker.sock explicitly
- **AND** the container receives no Docker endpoint, socket or CLI
- **AND** the host's rootful socket is not exposed to the container.

#### Scenario: Unsupported working directory or root identity
- **WHEN** the physical working directory is outside the mounted roots or UID/GID is zero
- **THEN** the launcher rejects the command before creating a container.

#### Scenario: Browser QA of a container dev server
- **WHEN** an agent requests --publish 5173:5173 and starts a server on 0.0.0.0
- **THEN** the server is exposed on host loopback only
- **AND** other ports remain unpublished.

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
to build or run containers uses the host runtime directly, not the sandbox.

#### Scenario: Missing development runtime
- **WHEN** an agent needs a runtime absent from the image
- **THEN** it updates the image and checks, rebuilds and verifies the consumer
- **AND** it does not install that runtime on the host.

#### Scenario: Container build requested inside the sandbox
- **WHEN** a task needs Docker, compose or buildx
- **THEN** it runs that tooling on the host runtime rather than in the sandbox
- **AND** the sandbox image is not extended with container-engine tooling.
