# Standalone browser MCP

## Independent image build

Base images and the Dockerfile frontend use Google's public `mirror.gcr.io`
Docker Hub cache. This avoids anonymous GitHub-runner HTTP 429 pulls without
new credentials or dependency-version changes. Bun, Debian and frontend
manifest digests matched Docker Hub when switched. Distroless is unchanged.
Cache availability is not guaranteed; a miss fails explicitly. Recheck cached
base versions when upgrading them.

This directory owns the browser Dockerfile, build context and image check.
It does not require the app Dockerfile, upstream web bundle or host shell tools.
`.github/workflows/browser.yml` publishes browser tags on browser-only changes,
weekly rebuilds and manual dispatch. App changes do not trigger a browser build.

From the repository root:

```sh
docker build -t openchamber-browser:check docker/browser
docker run --rm -i --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:exec,size=512m,mode=1777 \
  --shm-size=512m --entrypoint node openchamber-browser:check \
  --input-type=module < docker/browser/check-image.mjs
```

The check exercises real Chromium, 38 MCP tools, responsive layout/color
preference, authentication, navigation, screenshot, destination policy and
cleanup. Runtime paths and image names remain unchanged.

This package is the active Chromium MCP backend. The custom Agent Browser extension has been removed. This package has no guest service, panel, extension manifest, install ZIP or surface routes.

## Tool routing and evidence

The `browser` MCP controls standalone Chromium. Use it for web navigation, DOM interaction, screenshots and browser diagnostics. It does not control OpenChamber's native Preview, terminal, sessions or worktrees. Those features use their own currently advertised native interfaces.

Tabs, cookies and login state are separate from OpenChamber. MCP pages do not automatically appear in the desktop UI. Report evidence as "verified in MCP Chromium". Only claim "verified in OpenChamber's desktop UI" after checking that UI directly. Do not load archived extension instructions for active MCP work.

Every tool description identifies this boundary, and MCP initialization supplies the routing instructions. Keep the MCP key `browser` and existing tool names stable. Core enables native OpenChamber Web (`agentWebToolEnabled=true`, `browserProvider=builtin`) for the preferred desktop panel and keeps `agentControlToolEnabled=true` for native workspace features. These are separate from this MCP. External OpenCode does not automatically receive managed-child plugins.

It provides 38 browser tools, bearer authentication, destination grants, temporary profile and 30-minute idle expiry. The MCP listens on loopback 3002 by default. `/health` shares that port. Core exposes `/mcp` over Caddy HTTPS 3003.

## QA without browser installation

Chromium, its runtime libraries, certificates, fonts and MCP code are baked into the image. Agents use the connected `browser` MCP directly. Do not install Playwright, download Chromium, start another browser server or attach raw CDP for ordinary agent QA.

Use `browser_set_viewport` to change actual responsive layout (1–3840 CSS pixels), optionally mobile layout and the active page's light/dark color preference. `browser_screenshot` width/height change capture bounds only. Run the application using its existing host/project tooling, navigate to its localhost URL, exercise forms/keyboard/scroll/tabs, inspect console and network, and capture before/after images. Other private/LAN targets still need approved grants.

The browser is not an application build runner, test-framework installation, Firefox/WebKit farm, file-upload/download API or native OpenChamber viewer. Project-specific automated suites and optional external integrations keep their own documented prerequisites. No extra browser setup is needed for supported MCP QA, but this is not universal Codex/Cursor feature parity.

## Resource behavior

The final distroless image contains bundled MCP JavaScript and Chromium's shared-library/NSS/font closure. Its only JavaScript runtime dependency is bundled `ws`; esbuild and Bun are build-only. There is no shell, Git, package manager, SDK, extension panel or screencast loop. Chromium launches lazily on browser use. A one-shot deadline resets after each action and closes/removes the profile after 30 minutes idle, without periodic idle polling. No profile or expiry timer exists at cold idle. An active web page may consume significant resources until tabs close or expiry runs; close probe tabs when done, without shortening the settled login window.

Build with `bun install --frozen-lockfile && bun run build`. The browser image copies only `dist/` to `/opt/browser`, plus Chromium and its library/font closure. Configuration and the existing `OPENCHAMBER_BROWSER_*` environment names remain compatible. The host MCP key is `browser`.

Core runtime code derives from the former extension. Active changes belong here. The extension and its unused Docker panel/surface patches have been removed; inherited licenses and attribution remain.
