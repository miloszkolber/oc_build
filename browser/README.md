# Standalone browser MCP

This package is the active Chromium MCP backend. The Agent Browser OpenChamber extension is archived separately. This package has no guest service, panel, extension manifest, install ZIP or surface routes.

It retains the 37 browser tools, bearer authentication, destination grants, temporary profile and 30-minute idle expiry. The MCP listens on loopback 3002 by default. `/health` shares that port. Core exposes `/mcp` over Caddy HTTPS 3003.

Build with `bun install --frozen-lockfile && bun run build`. The browser image copies only `dist/` to `/opt/browser`, plus Chromium and its library/font closure. Configuration and the existing `OPENCHAMBER_BROWSER_*` environment names remain compatible. The host MCP key is `browser`.

Core runtime code was extracted from the archived extension. Active changes belong here. The archived extension is not installed, packaged or approved on the host.
