# Standalone browser MCP

This package is the active Chromium MCP backend. The Agent Browser OpenChamber extension is archived separately. This package has no guest service, panel, extension manifest, install ZIP or surface routes.

## Tool routing and evidence

The `browser` MCP controls standalone Chromium. Use it for web navigation, DOM interaction, screenshots and browser diagnostics. It does not control OpenChamber's native Preview, terminal, sessions or worktrees. Those features use their own currently advertised native interfaces.

Tabs, cookies and login state are separate from OpenChamber. MCP pages do not automatically appear in the desktop UI. Report evidence as "verified in MCP Chromium". Only claim "verified in OpenChamber's desktop UI" after checking that UI directly. Do not load archived extension instructions for active MCP work.

Every tool description identifies this boundary, and MCP initialization supplies the routing instructions. Keep the MCP key `browser` and existing tool names stable. On Core, the native agent browser-control tool remains disabled so it is not advertised as a second browser-control path.

It retains the 37 browser tools, bearer authentication, destination grants, temporary profile and 30-minute idle expiry. The MCP listens on loopback 3002 by default. `/health` shares that port. Core exposes `/mcp` over Caddy HTTPS 3003.

Build with `bun install --frozen-lockfile && bun run build`. The browser image copies only `dist/` to `/opt/browser`, plus Chromium and its library/font closure. Configuration and the existing `OPENCHAMBER_BROWSER_*` environment names remain compatible. The host MCP key is `browser`.

Core runtime code was extracted from the archived extension. Active changes belong here. The archived extension is not installed, packaged or approved on the host.
