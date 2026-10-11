# Browser MCP specification

## Purpose

The browser MCP image is a standalone distroless Chromium MCP server. It gives
coding agents real browser QA without any browser installation on the agent
side, and it stays strictly separate from OpenChamber's native desktop browser
panel. Its contract is that it is independently built and published, that its
Chromium profile is temporary and short-lived, and that it never widens into a
build runner, a test-framework host or a desktop attachment.

Source of truth for build commands and tool routing: [`docker/browser/README.md`](../../../docker/browser/README.md).

## Requirements

### Requirement: Independent build and publication

The browser image SHALL be built and published from its own context, without the
app image, the upstream web bundle or host shell tools.

#### Scenario: Browser-only change

- GIVEN a push changes only `docker/browser/**`
- WHEN the Browser image workflow runs
- THEN it builds the browser package alone
- AND the app workflow does not run for that change

#### Scenario: App-only change

- GIVEN a push changes only app image sources
- WHEN workflows are evaluated
- THEN the browser workflow does not run

#### Scenario: Scheduled rebuild

- GIVEN the weekly Monday 04:37 schedule fires
- WHEN the browser workflow runs
- THEN the newest browser package is rebuilt and republished with the current Dockerfile

#### Scenario: Image tag

- GIVEN a successful browser build on `main`
- WHEN the image is published
- THEN it is tagged `<browser-package-version>-<source-commit>`
- AND the same bytes are also tagged `latest`

### Requirement: Baked Chromium closure

The image SHALL contain Chromium and every runtime dependency it needs, so no
browser installation or download is required at runtime.

#### Scenario: Runtime contents

- GIVEN the final image
- WHEN it is inspected
- THEN it contains bundled MCP JavaScript at `/opt/browser`, Chromium and its shared-library, NSS, font and certificate closure
- AND it records the source revision, Chromium version and relevant Debian package versions in `/usr/share/openchamber/browser-build.json`
- AND runtime attribution is present under `/usr/share/licenses/browser/` and `/usr/share/licenses/debian/`

#### Scenario: Build-only dependencies

- GIVEN the final image
- WHEN its JavaScript dependencies are inspected
- THEN the only runtime JavaScript dependency is the bundled `ws` package
- AND `esbuild` and Bun are absent from the runtime

#### Scenario: Absent capabilities

- GIVEN the final image
- WHEN it is inspected
- THEN there is no shell, Git, package manager, SDK, extension panel, extension manifest, install ZIP or screencast loop

### Requirement: Standalone Chromium lifecycle

Chromium SHALL start lazily on first browser use and one temporary profile
SHALL be removed when the MCP goes idle.

#### Scenario: Cold idle

- GIVEN the MCP is running and no browser tool has been used
- WHEN the container is inspected
- THEN no Chromium process exists and no expiry timer is running

#### Scenario: Lazy start

- GIVEN a browser tool is invoked
- WHEN the tool runs
- THEN Chromium launches and one temporary profile is created

#### Scenario: Idle expiry

- GIVEN a browser action completed thirty minutes ago
- WHEN the one-shot deadline elapses
- THEN Chromium closes and the temporary profile is removed without periodic idle polling

#### Scenario: Shutdown and crash recovery

- GIVEN the container is shutting down or recovering from a crash
- WHEN cleanup runs
- THEN the temporary profile is removed

#### Scenario: No login persistence

- GIVEN a browser session signs in to a site
- WHEN the profile is recreated after expiry
- THEN the login is not retained

### Requirement: Authentication and destination policy

The browser MCP SHALL require a bearer token and SHALL enforce the existing
destination grants.

#### Scenario: Token required

- GIVEN the MCP is configured
- WHEN `OPENCHAMBER_BROWSER_MCP_TOKEN` is absent
- THEN the MCP refuses to serve unauthenticated requests

#### Scenario: Destination grants

- GIVEN a navigation targets a private or LAN address
- WHEN no approved grant covers it
- THEN the request is refused

#### Scenario: Token hygiene

- GIVEN a browser session runs
- WHEN the MCP operates
- THEN the token never appears in image layers, source, URLs or logs

#### Scenario: Endpoint shape

- GIVEN Core's deployment
- WHEN the MCP is reached
- THEN it listens on authenticated loopback port 3002
- AND `/health` shares that port
- AND Caddy exposes `https://core.mewa.sh:3003/mcp` with the same bearer token
- AND native OpenCode's MCP key is `browser`

### Requirement: Routing boundary with the desktop panel

The browser MCP SHALL control only its own Chromium, and SHALL state that
boundary to every caller.

#### Scenario: What the MCP controls

- GIVEN an agent invokes a browser MCP tool
- WHEN the tool acts
- THEN it navigates, interacts, screenshots and collects diagnostics in the standalone Chromium only
- AND it does not control OpenChamber's native Preview, terminal, sessions or worktrees

#### Scenario: What the MCP cannot see

- GIVEN the operator has tabs, cookies or logins in the desktop panel
- WHEN the MCP inspects its own browser
- THEN none of that state is present or reachable
- AND MCP pages do not automatically appear in the desktop UI

#### Scenario: Evidence wording

- GIVEN an agent reports a browser result
- WHEN the result came from this MCP
- THEN it is reported as verified in MCP Chromium
- AND it is reported as verified in the desktop UI only after that UI was checked directly

#### Scenario: Instructions reach the model

- GIVEN an MCP session initializes
- WHEN the tool list is served
- THEN every tool description identifies the routing boundary
- AND MCP initialization supplies the routing instructions

### Requirement: QA without a browser installation

Agents SHALL be able to run supported browser QA against the connected MCP
without installing Playwright, downloading Chromium, starting another browser
server or attaching raw CDP.

#### Scenario: Responsive layout

- GIVEN an agent needs to test a responsive breakpoint
- WHEN it calls `browser_set_viewport`
- THEN the actual layout changes within 1 to 3840 CSS pixels, optionally with mobile layout and the page's light or dark color preference

#### Scenario: Capture bounds

- GIVEN an agent needs a specific capture region
- WHEN it calls `browser_screenshot` with width and height
- THEN only the capture bounds change, not the viewport

#### Scenario: Application under test

- GIVEN an agent needs to QA a local application
- WHEN it navigates to the application's localhost URL using the host's existing tooling
- THEN forms, keyboard, scroll and tabs are exercised in the MCP Chromium
- AND console and network are inspected
- AND before and after images are captured

### Requirement: Explicit non-capabilities

The browser MCP SHALL not grow into capabilities it does not have, and its
documentation SHALL state each one.

#### Scenario: Not a build or test runner

- GIVEN a project needs a framework build or a package manager
- WHEN an agent considers using the browser MCP
- THEN the browser MCP is not used, because it is not a build runner or a test-framework installation

#### Scenario: Not a multi-engine farm

- GIVEN a change needs Firefox or WebKit rendering
- WHEN an agent considers using the browser MCP
- THEN the browser MCP is not used, because it is a single Chromium

#### Scenario: Not a file transfer API

- GIVEN an agent needs to upload or download a file
- WHEN it considers the browser MCP tool set
- THEN it finds no file upload or download API

#### Scenario: Not universal parity

- GIVEN a comparison with another product's browser tooling
- WHEN the comparison is made
- THEN this package is not claimed to provide universal feature parity; project-specific suites keep their own documented prerequisites

### Requirement: Runtime hardening

The browser container SHALL run with read-only root, UID 1000, dropped
capabilities, no-new-privileges, an init process and a bounded executable
`/tmp`.

#### Scenario: Run configuration

- GIVEN a browser container starts
- WHEN its security configuration is read
- THEN it uses read-only root, UID 1000, dropped capabilities and `no-new-privileges`
- AND `/tmp` is a bounded executable tmpfs
- AND shared memory is sized at 512 MB

#### Scenario: Isolated sandbox exception

- GIVEN the isolated Chromium sandbox exception
- WHEN the container runs
- THEN it remains explicit through `OPENCHAMBER_BROWSER_NO_SANDBOX=1` and is not applied silently

#### Scenario: Mount surface

- GIVEN a browser container is configured
- WHEN its mounts are reviewed
- THEN only browser configuration is mounted
- AND no workspace, home or credential directory is mounted
- AND no Docker socket is exposed

### Requirement: Base-image cache behavior

The browser image SHALL pull base images and the Dockerfile frontend through
Google's public `mirror.gcr.io` cache, and SHALL fail explicitly on a miss.

#### Scenario: Cache miss

- GIVEN a cached base image is unavailable
- WHEN the build pulls it
- THEN the build fails with an explicit error

#### Scenario: Base version change

- GIVEN a base image version changes
- WHEN the change is prepared
- THEN cached availability is rechecked before the change lands

### Requirement: Pre-publication image check

The browser image SHALL be checked as a real running container before it is
published.

#### Scenario: Browser image check

- GIVEN a freshly built browser image
- WHEN `docker/browser/check-image.mjs` runs inside it with `--network none --read-only --cap-drop ALL`
- THEN it exercises real Chromium, all 38 MCP tools, responsive layout and color preference, authentication, navigation, screenshot, destination policy and cleanup
