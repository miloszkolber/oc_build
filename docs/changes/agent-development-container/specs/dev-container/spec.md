# Delta for dev-container

## Purpose

The development container gives coding agents a build and test environment with
a known toolchain, so a task's outcome depends on the repository rather than on
whatever happens to be installed on the host.

## ADDED Requirements

### Requirement: Toolchain completeness

The development image SHALL carry every toolchain this repository's builds
consume, at a pinned version.

#### Scenario: Tools resolve

- GIVEN the development image
- WHEN an agent runs a command inside it
- THEN Bun, Node, the Docker CLI, Git and ripgrep resolve on `PATH`
- AND each reports the pinned version the image was built with

#### Scenario: Pinned versions match CI

- GIVEN the image and the GitHub Actions workflows
- WHEN their toolchain versions are compared
- THEN they match, and a difference fails the parity check rather than being noted in a comment

#### Scenario: No extra toolchains

- GIVEN the image
- WHEN its installed toolchains are inventoried
- THEN nothing is present that no build in this repository consumes

### Requirement: Surviving workspace and caches

Runs SHALL keep workspace writes and downloaded dependencies across invocations.

#### Scenario: Workspace persistence

- GIVEN the repository is mounted at the workspace path
- WHEN a run creates a file there and a later run reads it
- THEN the file is present with its contents intact

#### Scenario: Cache persistence

- GIVEN the Bun global cache volume is populated by a first run
- WHEN a second run installs dependencies
- THEN the install step reuses the cache instead of downloading every package

#### Scenario: Clean checkout

- GIVEN a fresh clone with no cache volumes
- WHEN the documented install command runs
- THEN it completes without a pre-existing cache

#### Scenario: Lockfile fidelity

- GIVEN a documented install command
- WHEN it runs in the container and in CI
- THEN both use the frozen lockfile, so a drift fails rather than silently resolving

### Requirement: Documented entry points

The image SHALL expose the repository's real build, test and package commands
through stable entry points.

#### Scenario: Entry point coverage

- GIVEN the documented entry points
- WHEN they are listed
- THEN they cover extension install, test, package, example validation and a local image build for each image context

#### Scenario: Entry points run from a clean checkout

- GIVEN a clean checkout of the repository
- WHEN each documented entry point runs in the container
- THEN it exits zero without host-specific setup

#### Scenario: No new commands invented

- GIVEN the repository's workflows
- WHEN their run steps are compared with the container's entry points
- THEN the container runs the same commands CI runs, with no container-only variant

### Requirement: CI parity

The same commands SHALL pass in the container and in GitHub Actions.

#### Scenario: Parity job

- GIVEN a pull request changes a build, test or package path
- WHEN the parity check runs
- THEN it runs the documented entry points in the container
- AND it fails when any of them fails

#### Scenario: Toolchain drift detection

- GIVEN a workflow changes a pinned toolchain version
- WHEN the parity check runs
- THEN it fails if the image does not carry the same version

### Requirement: Default isolation

The development container SHALL not reach the host Docker daemon unless an
operator explicitly opts in.

#### Scenario: Default run

- GIVEN a container started with the documented run command
- WHEN its mounts are inspected
- Then no Docker socket is mounted
- And no host home directory or credential directory is mounted

#### Scenario: Opt-in socket

- GIVEN an operator needs to build an image from inside the container
- WHEN they run with the documented opt-in flag
- THEN the host Docker socket is mounted for that run only

#### Scenario: Published images unaffected

- GIVEN the development container exists
- WHEN the published app and browser images are built
- Then their contents are unchanged by it

### Requirement: Image check before use

The development image SHALL be checked as a real running container before it is
relied on.

#### Scenario: Check contents

- GIVEN a freshly built development image
- WHEN its check script runs inside it with `--network none --read-only --cap-drop ALL`
- THEN it verifies each toolchain resolves at the pinned version
- AND it verifies each documented entry point runs
- AND it verifies the workspace and cache mount points are writable

#### Scenario: Scheduled rebuild

- GIVEN the development image
- WHEN a weekly rebuild fires
- THEN the image is rebuilt against current base layers and rechecked, so a broken base fails visibly
