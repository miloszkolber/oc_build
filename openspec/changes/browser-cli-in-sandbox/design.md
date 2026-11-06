# Design

## Tool choice

- **Obscura 0.2.6** provides the engine, CDP server and a native CLI (`fetch`, `serve`, `scrape`). Its Linux x86_64 archive is SHA-256 pinned at build.
- **playwright-core 1.65.0** supplies programmatic interaction (click, type, waits, screenshots, PDF) without downloading a bundled browser. It connects to a private Obscura CDP endpoint.
- A thin `browser` wrapper starts Obscura per invocation, connects once, runs one command and exits. No daemon, no port published outside loopback and no persistent profile by default.

## Alternatives rejected

- Keeping Chromium in the sandbox: larger, slower and defeats the requested footprint reduction.
- Keeping the MCP server: the operator explicitly asked for CLI rather than MCP.
- Installing full Playwright with browsers: duplicates the engine Obscura already provides.

## Security and lifecycle

- Obscura blocks loopback and private networks unless `--allow-private-network` is passed; the wrapper exposes that as an explicit flag.
- The CDP server binds loopback on an ephemeral port chosen per invocation and is killed when the command finishes.
- The sandbox remains a non-root, no-Docker-endpoint development container; the browser is not a hostile-code boundary.
