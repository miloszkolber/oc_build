## About

This repository builds the OpenChamber web image and the agent development sandbox image. The sandbox includes a headless browser CLI (Obscura and playwright-core). Behavior changes follow the [spec-driven workflow](openspec/README.md#working-a-change).

## Layout

| Path | Purpose |
| --- | --- |
| [`docker/openchamber/`](docker/openchamber/README.md) | App image, release automation, checks and local build instructions |
| [`docker/sandbox/`](docker/sandbox/README.md) | Agent development image, container toolchains, shared caches, headless browser CLI and run-scoped temporary state |
| [`skill/`](skill/README.md) | Agent-facing workspace skill: browser evidence and the development sandbox |

## Build and release

See [`docker/openchamber/README.md`](docker/openchamber/README.md) for image contents, release behavior, verification and local commands. Package-level build and install instructions are in each extension's README.

## Documentation

[`openspec/`](openspec/README.md) is the single documentation and planning tree: implemented [contracts](openspec/specs/), scoped [changes](openspec/changes/) and the [deferred backlog](openspec/backlog.md). Start at [`openspec/README.md`](openspec/README.md).
