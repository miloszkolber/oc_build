# Standalone browser MCP

This package is the active Chromium MCP backend. The Agent Browser OpenChamber extension is archived separately. This package has no guest service, panel, extension manifest, install ZIP or surface routes.

## Tool routing and evidence

The `browser` MCP controls standalone Chromium. Use it for web navigation, DOM interaction, screenshots and browser diagnostics. It does not control OpenChamber's native Preview, terminal, sessions or worktrees. Those features use their own currently advertised native interfaces.

Tabs, cookies and login state are separate from OpenChamber. MCP pages do not automatically appear in the desktop UI. Report evidence as "verified in MCP Chromium". Only claim "verified in OpenChamber's desktop UI" after checking that UI directly. Do not load archived extension instructions for active MCP work.

Every tool description identifies this boundary, and MCP initialization supplies the routing instructions. Keep the MCP key `browser` and existing tool names stable. On Core, the native agent browser-control tool remains disabled so it is not advertised as a second browser-control path.

It provides 38 browser tools, bearer authentication, destination grants, temporary profile and 30-minute idle expiry. The MCP listens on loopback 3002 by default. `/health` shares that port. Core exposes `/mcp` over Caddy HTTPS 3003.

## QA without browser installation

Chromium, its runtime libraries, certificates, fonts and MCP code are baked into the image. Agents use the connected `browser` MCP directly. Do not install Playwright, download Chromium, start another browser server or attach raw CDP for ordinary agent QA.

Use `browser_set_viewport` to change actual responsive layout (1–3840 CSS pixels), optionally mobile layout and the active page's light/dark color preference. `browser_screenshot` width/height change capture bounds only. Run the application using its existing host/project tooling, navigate to its localhost URL, exercise forms/keyboard/scroll/tabs, inspect console and network, and capture before/after images. Other private/LAN targets still need approved grants.

The browser is not an application build runner, test-framework installation, Firefox/WebKit farm, file-upload/download API or native OpenChamber viewer. Project-specific automated suites and optional external integrations keep their own documented prerequisites. No extra browser setup is needed for supported MCP QA, but this is not universal Codex/Cursor feature parity.

## Resource behavior

The final distroless image contains bundled MCP JavaScript and Chromium's shared-library/NSS/font closure. Its only JavaScript runtime dependency is bundled `ws`; esbuild and Bun are build-only. There is no shell, Git, package manager, SDK, extension panel or screencast loop. Chromium launches lazily on browser use. After 30 minutes without actions the runtime closes and removes its profile. No profile exists at cold idle. An open active web page may consume significant resources until tabs close or expiry runs; close probe tabs when done, without shortening the settled login window.

Build with `bun install --frozen-lockfile && bun run build`. The browser image copies only `dist/` to `/opt/browser`, plus Chromium and its library/font closure. Configuration and the existing `OPENCHAMBER_BROWSER_*` environment names remain compatible. The host MCP key is `browser`.

Core runtime code was extracted from the archived extension. Active changes belong here. The archived extension is not installed, packaged or approved on the host.
