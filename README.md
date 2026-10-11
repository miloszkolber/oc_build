## About

This repository builds the OpenChamber web image and standalone distroless `openchamber-browser` MCP image. It also ships the Rembric OpenCode V2 plugin.
The agent development toolkit is a separate `openchamber-sandbox` image.
Start with [the documentation workflow](docs/README.md) before changing contracts.

## Layout

| Path | Purpose |
| --- | --- |
| [`docker/openchamber/`](docker/openchamber/README.md) | App and browser image targets, release automation, checks and local build instructions |
| [`docker/browser/`](docker/browser/README.md) | Active standalone Chromium MCP package, no extension panel or guest API |
| [`docker/sandbox/`](docker/sandbox/README.md) | Agent development tools, persistent caches and per-run scratch |
| [`extensions/rembric/`](extensions/rembric/README.md) | Rembric OpenCode V2 plugin and its standalone build/install scripts |
| [`extensions/canvas/`](extensions/canvas/README.md) | File-backed json-render Canvas panel, charts and interactive quick tools |

## Build and release

See [`docker/openchamber/README.md`](docker/openchamber/README.md) for image contents, release behavior, verification and local commands. Package-level build and install instructions are in each extension's README.
