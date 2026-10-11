# App image specification

## Purpose

The app image packages the upstream OpenChamber web release as a container that
serves the web interface to an externally managed OpenCode service. Its contract
is that the image stays distroless-minimal while still supporting native
terminals, Git SSH remotes and terminal process cleanup, and that it never
bundles OpenCode, a package manager or a browser.

Source of truth for build commands: [`docker/openchamber/README.md`](../../../docker/openchamber/README.md).

## Requirements

### Requirement: Upstream release baking

The image SHALL bake an upstream `openchamber-web-<version>.tgz` release whose
version matches the requested `OPENCHAMBER_VERSION` build argument.

#### Scenario: Version matches the requested release

- GIVEN a build with `OPENCHAMBER_VERSION=2.2.0`
- WHEN the bundle stage finishes
- THEN the installed `package.json` version equals `2.2.0`
- AND the build fails if it does not

#### Scenario: Integrity pin supplied

- GIVEN `OPENCHAMBER_ASSET_SHA256` is set
- WHEN the tarball is downloaded
- THEN the build verifies the digest before extraction
- AND the build fails on mismatch

#### Scenario: Unpinned build

- GIVEN `OPENCHAMBER_ASSET_SHA256` is empty
- WHEN the tarball is downloaded
- THEN the build proceeds without digest verification
- AND the version match check still applies

### Requirement: External OpenCode dependency

The container SHALL wait for the external OpenCode server to answer before it
serves the web bundle.

#### Scenario: OpenCode becomes ready

- GIVEN the container starts and OpenCode is not yet listening
- WHEN the entrypoint probes `${OPENCODE_HOST:-http://127.0.0.1:4096}/api/info`
- THEN it retries once per second until the endpoint returns a JSON body with a `version` string
- AND it then serves the web bundle in the foreground

#### Scenario: OpenCode never becomes ready

- GIVEN OpenCode does not answer
- WHEN sixty probe attempts have failed
- THEN the entrypoint writes a diagnostic to stderr
- AND exits non-zero without starting the web server

#### Scenario: Server credentials

- GIVEN `OPENCODE_SERVER_PASSWORD` is set
- WHEN the entrypoint probes `/api/info`
- THEN it sends HTTP Basic authentication with `OPENCODE_SERVER_USERNAME` or `opencode`
- AND a successful probe requires a JSON `version` string, not merely a 200 status

### Requirement: Minimal runtime tool set

The image SHALL contain only the OS tools the app genuinely consumes, each
collected with its shared-library closure, so the runtime stage needs no package
manager.

#### Scenario: Tools the app uses

- GIVEN the assembled runtime filesystem
- WHEN an agent opens a terminal, a Git SSH remote or a shebang script
- THEN Bash, Git, one BusyBox, the SSH client and `ps` are present with their libraries
- AND the BusyBox applets cover basic commands such as `env`, `ls`, `cat`, `cp`, `grep`, `sed` and `tar`

#### Scenario: Tools that are absent

- GIVEN the assembled runtime filesystem
- WHEN the image is inspected
- THEN no package manager is present
- AND no Chromium or browser binary is present
- AND no guest browser provider, guest service, extension manifest or surface route is present

#### Scenario: Runtime identity

- GIVEN the container runs as UID and GID 1000
- WHEN a process looks up the running user
- THEN a `core` identity with UID 1000 is resolved from `/etc/passwd`
- AND `root`, `nobody` and `nonroot` identities also resolve

### Requirement: Home-rooted repository opt-in

The image SHALL allow exactly one existing home-root Git checkout through an
explicit opt-in, and SHALL keep every other repository-root guard unchanged.

#### Scenario: Opt-in matches the repository root

- GIVEN `OPENCHAMBER_ALLOWED_HOME_REPOSITORY=/home/core`
- WHEN Git detects a repository rooted at `/home/core`
- THEN the repository is accepted and Git features are enabled

#### Scenario: Opt-in is absent or mismatched

- GIVEN the variable is unset
- WHEN Git detects a repository rooted at the user's home directory
- THEN the repository is rejected and a warning is logged once per root

#### Scenario: Opt-in points at a filesystem root

- GIVEN the variable names a filesystem root such as `/`
- WHEN the repository-root check runs
- THEN the repository-root detection stays unchanged and the root remains rejected

#### Scenario: Upstream implementation changes

- GIVEN the patched region of `server/lib/git/service.js` no longer matches
- WHEN the bundle stage applies `home-repository.patch`
- THEN the build fails rather than silently shipping an unpatched image

### Requirement: Self-update patch stability

The image SHALL apply its `self-update.patch` strictly, and SHALL fail the build
if the upstream implementation it patches has changed.

#### Scenario: Strict patch application

- GIVEN the bundle stage reaches the patch step
- WHEN `patch --batch --forward --fuzz=0` runs
- THEN any failure to apply the patch fails the build

### Requirement: Published image provenance

Every published app image SHALL carry the labels that identify its origin.

#### Scenario: Build labels

- GIVEN a CI image build
- WHEN the image is built
- THEN it carries `org.opencontainers.image.source`, `org.opencontainers.image.revision` and `io.openchamber.upstream.release-id`
- AND the source revision is the publishing commit

#### Scenario: Provenance accepted across the rename

- GIVEN an image published before the repository was renamed to `oc_build`
- WHEN `releases.mjs verify-origin` reads its source label
- THEN the former `miloszkolber/openchamber` source URL is accepted as equivalent provenance

### Requirement: Runtime image checks

The image SHALL be checked as a real running container before anything that
bakes it is published.

#### Scenario: App image check

- GIVEN a freshly built app image
- WHEN `docker/openchamber/check-image.mjs` runs inside it with `--network none --read-only --cap-drop ALL`
- THEN it verifies the CLI, Git and shell commands, file commands, SSH and user identity, PTY output, terminal process cleanup and runtime syntax
- AND it verifies the absence of Chromium

#### Scenario: Entrypoint regression

- GIVEN the tools build stage
- WHEN `entrypoint.test.mjs` runs with `--network=none` against only the Bun-backed Node shim on `PATH`
- THEN the shell entrypoint behaves correctly without the full runtime toolset present

### Requirement: Base-image cache behavior

The image SHALL pull Docker Hub base images and the Dockerfile frontend through
Google's public `mirror.gcr.io` cache, and SHALL fail explicitly on a cache miss
rather than falling back to a rate-limited direct pull.

#### Scenario: Cache hit

- GIVEN a build starts
- WHEN base images are pulled
- THEN they resolve through `mirror.gcr.io` without registry credentials
- AND the Dockerfile frontend resolves through the same cache

#### Scenario: Cache miss

- GIVEN a cached base image is unavailable
- WHEN the build pulls it
- THEN the build fails with an explicit error
- AND the build does not silently retry against Docker Hub directly

#### Scenario: Base version change

- GIVEN a base image version changes
- WHEN the change is prepared
- THEN cached availability is rechecked before the change lands
