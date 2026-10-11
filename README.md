## About

This repository builds the OpenChamber web image, standalone distroless browser MCP, Canvas panel and Rembric OpenCode V2 plugin. Behavior changes follow the [spec-driven workflow](docs/README.md#working-a-change).

## Layout

| Path | Purpose |
| --- | --- |
| [`docker/openchamber/`](docker/openchamber/README.md) | App image, release automation, checks and local build instructions |
| [`docker/browser/`](docker/browser/README.md) | Active standalone Chromium MCP package, no extension panel or guest API |
| [`extensions/rembric/`](extensions/rembric/README.md) | Rembric OpenCode V2 plugin and its standalone build/install scripts |
| [`extensions/canvas/`](extensions/canvas/README.md) | File-backed json-render Canvas panel, charts and interactive quick tools |

## Build and release

See [`docker/openchamber/README.md`](docker/openchamber/README.md) for image contents, release behavior, verification and local commands. Package-level build and install instructions are in each extension's README.

## Documentation

[`docs/`](docs/README.md) owns implemented [contracts](docs/specs/), scoped [changes](docs/changes/) and the [deferred backlog](docs/backlog.md). The root `openspec` symlink exposes the same files to OpenSpec. Start at [`docs/README.md`](docs/README.md).
