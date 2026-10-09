# Agent Browser for OpenChamber

Agent Browser is a local adaptation of upstream Server Browser v0.7.0 at commit `6c5e76ddfa21b574d0521a27f408cd643673161c`; it is not an upstream Server Browser release. It provides one temporary Chromium browser shared by OpenChamber's `openchamber_web` BrowserProvider, its surface panel, and a 37-tool MCP endpoint. It targets OpenChamber 2.1.1 or newer and `@openchamber/sdk` 2.1.1. See [NOTICE](NOTICE), [LICENSE](LICENSE), and [THIRD_PARTY_LICENSES](THIRD_PARTY_LICENSES) for provenance and attribution.

## Runtime layout

The broker owns the only browser manager, Chromium process, temporary profile, page, tabs, cookies, and authentication state. BrowserProvider calls and MCP tools go through that owner; panel frames and input relay through the OpenChamber guest service to the same broker. All chats share this browser by design.

The broker entrypoint is `broker/main.js`. It binds MCP at `127.0.0.1:3000/mcp` and a private guest API at `127.0.0.1:3001` by default. Set `OPENCHAMBER_BROWSER_MCP_PORT` and `OPENCHAMBER_BROWSER_API_PORT` to change those ports. `OPENCHAMBER_BROWSER_MCP_TOKEN` is required at broker startup. `OPENCHAMBER_BROWSER_CONFIG_PATH` may point to the broker's local `config.json`.

The extension service entrypoint is `service/main.js`, as declared in `package.json`. OpenChamber starts it only after the user approves the extension service, supplies its ephemeral `OPENCHAMBER_SERVICE_PORT` and `OPENCHAMBER_SERVICE_TOKEN`, and proxies authenticated requests to it. The service resolves the broker API URL in this order: `OPENCHAMBER_BROWSER_BROKER_URL` when the process environment provides it, then `brokerUrl` in the extension's own `config.json`, then `http://127.0.0.1:3001`. OpenChamber spawns guest services with a sanitized environment (only `HOME`, `PATH`, `OPENCHAMBER_SERVICE_PORT`, and `OPENCHAMBER_SERVICE_TOKEN`), so `OPENCHAMBER_BROWSER_BROKER_URL` is not delivered to the shipped service; set `brokerUrl` in `config.json` to point the panel at a different broker. Only a plain-HTTP `127.0.0.1` URL is dialable, and an invalid value fails service startup instead of silently using the default. The viewer never connects to the broker API or MCP port directly. Keep both broker listeners on loopback; do not publish, forward, or reverse-proxy port 3001.

## Install and approve

1. In OpenChamber **Settings → Extensions**, install this package from the source path or archive, then explicitly approve **Run a local service**.
2. Select **Agent Browser** under **Settings → General → OpenChamber Tools → Browser provider**.
3. Start the broker sidecar (see [Sidecar run recipe](#sidecar-run-recipe)) and connect an MCP client to `http://127.0.0.1:3000/mcp`.
4. Open **Agent Browser** in the panel and connect the agent to the broker's MCP endpoint. The BrowserProvider, panel, and MCP all control the same page. While a viewer holds control, provider and MCP actions are refused; retry them after control is handed back.

Service approval is a trust decision rather than an OS sandbox: the relay service runs in the OpenChamber application container under its user and mount access. The broker is supplied by the image integration, not spawned by the extension; keep the sidecar free of host mounts and application secrets. The packaged extension can be installed independently, but browser actions and the surface relay require the broker API at the configured loopback URL.

## MCP client

The broker exposes an authenticated MCP endpoint on loopback. For OpenCode V2, define `OPENCHAMBER_BROWSER_MCP_TOKEN` in both the broker and OpenCode process environments, then configure the remote MCP connection with an environment-substituted header. Keep the token value out of source control and config files:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "agent-browser": {
        "type": "remote",
        "url": "http://127.0.0.1:3000/mcp",
        "oauth": false,
        "headers": {
          "Authorization": "Bearer {env:OPENCHAMBER_BROWSER_MCP_TOKEN}"
        }
      }
    }
  }
}
```

The browser profile is temporary and removed on broker shutdown or idle expiry. The broker closes it after 30 minutes without an action or surface frame request; an open viewer keeps it alive. Set `idleTimeoutMs` in broker config to a value between 60000 and 86400000 milliseconds. Cleanup runs every 30 seconds, waits for pending actions and releases the control lease. The next action creates a fresh profile. Restart and expiry clear tabs, cookies, local/session storage, and authentication; this is not durable login storage.

## MCP tools

The endpoint advertises the exact Obscura v0.2.4 inventory and input fields, with a parity regression test against the supplied `tools/list` capture. These are implemented browser operations, not pass-through placeholders: page navigation and history; DOM snapshot, selector/ref click and form edits; key/scroll input; page JavaScript; selector/text waits; network and console logs; Markdown, link, form, element, attribute, count, extraction, and search queries; tab management; cookie and storage get/set/clear; screenshot and PDF capture; and close/reset. The exact names and schemas are `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill`, `browser_type`, `browser_press_key`, `browser_select_option`, `browser_evaluate`, `browser_wait_for`, `browser_network_requests`, `browser_console_messages`, `browser_close`, `browser_markdown`, `browser_links`, `browser_interactive_elements`, `browser_back`, `browser_forward`, `browser_reload`, `browser_get_cookies`, `browser_set_cookie`, `browser_clear_cookies`, `browser_wait_for_text`, `browser_detect_forms`, `browser_fill_form`, `browser_scroll`, `browser_get_attribute`, `browser_count`, `browser_extract`, `browser_tab_new`, `browser_tab_list`, `browser_tab_switch`, `browser_tab_close`, `browser_search`, `browser_storage_state`, `browser_set_storage_state`, `browser_screenshot`, and `browser_pdf`.

## Configuration

The broker and guest service share one `config.json` beside the extension. `config.example.json` documents the shape; local `config.json` is ignored by Git and is not included in the install package.

- `chromePath` — absolute path to a Chrome or Chromium binary. Set it only when Chromium cannot be discovered automatically; an unusable path fails startup.
- `brokerUrl` — plain-HTTP loopback URL of the broker API. The broker reads and ignores it; it exists so the broker and guest service share one file. Defaults to `http://127.0.0.1:3001`.
- `allowedOrigins` — exact public or local http(s) origins to permit, such as `http://127.0.0.1:5173`. Empty by default.
- `allowedNetworks` — private or loopback IPv4 CIDRs no broader than `/8`, each with explicit ports, to permit without naming an origin. Empty by default.
- `discoverDevServers` — when `true`, grants eligible loopback listeners discovered on the host. Off by default; it broadens access to local services, so prefer explicit origins.

```json
{
  "brokerUrl": "http://127.0.0.1:3001",
  "allowedOrigins": ["http://127.0.0.1:5173"],
  "allowedNetworks": [],
  "discoverDevServers": false
}
```

## Network policy

Public HTTP(S) destinations are available through the browser. Private and loopback destinations are denied unless explicitly permitted. `config.example.json` starts with empty `allowedOrigins` and `allowedNetworks`; keep these empty unless local access is needed. For local fixtures or development servers, allow only the exact origins and private IPv4 blocks/ports required, then restart the broker. The MCP and surface paths use the same Chromium network proxy and allowlist; neither has a separate egress policy. Cloud metadata, link-local, reserved, transition, multicast, and CGNAT destinations remain denied.

## Security posture

The broker API is an unauthenticated, path-limited loopback bridge intended for the approved guest service on the same host. It is not a LAN service. The MCP endpoint also binds only to loopback and grants access to page automation, cookies, storage, and page JavaScript. `/health` is unauthenticated for readiness; every request to `/mcp` requires `Authorization: Bearer <token>`. Keep the token private and expose the endpoint only through a trusted MCP client. The browser child receives only ordinary runtime paths, never service credentials, and the temporary profile is mode `0700` and removed on shutdown.

## Sidecar run recipe

The app image bakes the installable package into `/opt/openchamber/extensions/agent-browser`, but does not contain Chromium. The separate distroless `openchamber-browser` image starts the broker at `/opt/openchamber/extensions/agent-browser/broker/main.js`; it has no app, git or shell. Run it without application mounts or credentials, read-only root, UID 1000, dropped capabilities, `no-new-privileges`, init, bounded `/tmp` tmpfs and `shm_size: 512m`. Its authorized `OPENCHAMBER_BROWSER_NO_SANDBOX=1` exception is not a general extension default. Surface delivery keeps the newest frame at 30fps and preserves final paints on static pages.

Create a private environment file for the isolated broker and give the same token to the native OpenCode service using its existing secret-management path:

```sh
install -d -m 700 /etc/openchamber-browser
umask 077
printf 'OPENCHAMBER_BROWSER_MCP_TOKEN=%s\n' "$(openssl rand -hex 32)" > /etc/openchamber-browser/browser.env
```

On a Linux host, run the sidecar on the host network namespace. Keep MCP on a temporary port while another service owns 3000:

```sh
docker run -d --name openchamber-agent-browser --init --restart unless-stopped \
  --network host --user 1000:1000 --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:exec,size=512m,mode=1777 --shm-size=512m \
  --env-file /etc/openchamber-browser/browser.env \
  --env OPENCHAMBER_BROWSER_NO_SANDBOX=1 \
  --env OPENCHAMBER_BROWSER_MCP_PORT=3002 \
  --env OPENCHAMBER_BROWSER_API_PORT=3001 \
  --entrypoint /nodejs/bin/node openchamber:2.1.1 \
  /opt/openchamber/extensions/agent-browser/broker/main.js
```

The host-networked container binds both services to `127.0.0.1`; do not add published ports. The OpenChamber guest service reaches the relay at `127.0.0.1:3001` when it shares the host network namespace. Shutdown and idle expiry remove the temporary profile.

## Build and verify

Use the repository-pinned Bun 1.4.2:

```sh
bun install --frozen-lockfile
bun run build
bun test test/*.test.js
bun run check
bun run package
```

`bun run build` stages the complete installable package in `dist/`: manifest, bundled panel/service/broker entries, licenses, README and example config. `bun run check` validates these and the 37 unique MCP tools. `bun run package` builds the deterministic `dist/openchamber-agent-browser-<version>.zip` archive using the package version. Run `bun test test/*.test.js` after the build; entrypoint and panel-layout tests use staged assets. Chromium integration tests run when Chrome is available and otherwise report skips. Runtime dependencies are bundled, so production needs no `node_modules`.
