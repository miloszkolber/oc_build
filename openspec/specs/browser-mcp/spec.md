# Browser MCP

## Purpose

Provide authenticated, destination-restricted browser actions in standalone Chromium without requiring an agent-side browser installation or desktop attachment.

Source: [runtime](../../../docker/browser/src/main.js), [MCP service](../../../docker/browser/src/mcp-service.js), [tool catalog](../../../docker/browser/src/mcp-tools.js), [Dockerfile](../../../docker/browser/Dockerfile). Commands: [README](../../../docker/browser/README.md). Check: [real Chromium image check](../../../docker/browser/check-image.mjs).

## Requirements

### Requirement: Standalone routing
The MCP SHALL control its own Chromium, distinct from native OpenChamber surfaces.

#### Scenario: State and evidence
- **WHEN** the MCP initializes or advertises tools
- **THEN** it states that desktop Preview, terminal, sessions and worktrees are outside its control
- **AND** tabs, cookies and login state are not shared with the desktop client
- **AND** checks through it are reported as MCP Chromium, not desktop acceptance

### Requirement: Authenticated MCP interface
The service SHALL require bearer authentication for `/mcp` and reject malformed or oversized requests without executing browser actions.

#### Scenario: Authentication and health
- **WHEN** no nonempty token is configured
- **THEN** startup fails
- **WHEN** a caller omits or sends a wrong bearer token to `/mcp`
- **THEN** it receives 401
- **AND** GET `/health` is a separate unauthenticated readiness endpoint on the same listener

#### Scenario: Request bounds
- **WHEN** an authenticated request is not POST, exceeds 2 MiB, or contains invalid JSON-RPC
- **THEN** it receives the corresponding method/size/parse error rather than a browser action

### Requirement: Destination restrictions
Browser traffic SHALL be constrained by the destination policy and configured grants.

#### Scenario: Denied destination
- **WHEN** navigation targets a private/LAN destination without an applicable grant
- **THEN** the policy denies it
- **AND** an allowed initial page does not authorize arbitrary destinations reached from it

### Requirement: Temporary browser lifecycle
The service SHALL create browser state lazily and remove its temporary profile on orderly close or expiry after the configured idle interval.

#### Scenario: Cold idle and action
- **WHEN** the service has not received a browser action
- **THEN** Chromium and its expiry timer are absent
- **WHEN** an action needs the browser
- **THEN** it starts with a temporary profile and serialized actions share that runtime

#### Scenario: Idle and failure
- **WHEN** the idle interval elapses after an action
- **THEN** the runtime closes and its profile is removed
- **AND** the default interval is 30 minutes, configurable from 1 minute to 24 hours
- **AND** a failed/disconnected runtime is reset before reuse

Orderly signal handling is implemented. SIGKILL or host-crash cleanup is not guaranteed by JavaScript finalizers. No persistent login store is provided.

### Requirement: Browser QA controls
The tool set SHALL support navigation, interaction, diagnostics and capture with explicitly distinct viewport and screenshot sizing.

#### Scenario: Layout versus capture
- **WHEN** `browser_set_viewport` sets width/height within 1–3840 CSS pixels
- **THEN** actual layout changes, with optional mobile and color-scheme settings
- **WHEN** screenshot width/height are supplied
- **THEN** they affect capture bounds, not layout

#### Scenario: Stable advertised surface
- **WHEN** the image check requests the tool list
- **THEN** it sees 38 unique tool names with standalone-routing descriptions
- **AND** navigation, responsive light/dark layout, screenshot, auth and policy checks run against real Chromium

### Requirement: Separate image closure
The browser image SHALL run independently of the app bundle with baked Chromium, its runtime closure, bundled MCP code and attribution.

#### Scenario: Build and runtime
- **WHEN** the browser context builds
- **THEN** no app sources or upstream web tarball are needed
- **AND** Chromium, NSS dynamic modules, fonts, certificates and build metadata are retained
- **AND** the runtime has no shell, Git, package manager or extension guest surface

Deployment must retain UID 1000, read-only root, dropped capabilities, no-new-privileges and bounded writable temporary storage. A no-sandbox launch requires the explicit `OPENCHAMBER_BROWSER_NO_SANDBOX=1` setting. Host mounts and public endpoints are deployment concerns, not inherent image guarantees.
