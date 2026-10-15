# Dependency maintenance refresh

## Why

A scheduled maintenance pass reviewed every pinned component this repository builds or ships, including the categories Dependabot does not cover: Docker base images and bundled upstream packages. Two findings need a fix now.

- `docker/sandbox/` installs `pnpm@11.1.2`. Version 11.1.2 is affected by thirteen published advisories (repository-controlled lockfiles/config expansion, integrity-check bypass, path traversal, arbitrary file write), all fixed at or below 11.11.0. The current 11.x line is 11.28.5 and is clean. The sandbox advertises pnpm as a toolchain, so a build can execute an untrusted lockfile through a vulnerable manager. No `package.json` in `docker/sandbox/` means Dependabot does not watch it.
- `extensions/rembric/core/rembric-plugin-core.mjs` was vendored from Rembric before plugin v0.34.0. Upstream v0.34.0 is a breaking change: the single `memory.get`/`memory.session_get`/`memory.confirm`/`memory.judge` MCP tools are replaced by `_batch` forms with no aliases, and the vendored nudge text still tells the model to call `memory.session_get`. Upstream also raised the recall-hints budget for cold connections (v0.33.2).

## Scope

- Bump `pnpm` to 11.28.5 in `docker/sandbox/Dockerfile`, assert it in `docker/sandbox/check-image.sh` and record it in the sandbox README.
- Re-vendor `extensions/rembric/core/rembric-plugin-core.mjs` byte-for-byte from Rembric plugin v0.34.0 and update the plugin README record.
- Bump the pinned Bun base image from 1.4.2 to 1.4.3 in the app, browser and sandbox Dockerfiles. Bun 1.4.3 fixes CVE-2026-48618 (host validation in `Bun.connect`) and hardens `node:http2` stream resets (CVE-2023-44487, CVE-2025-8671), and it matches the Bun version CI already runs.

Affected capabilities: agent sandbox, rembric plugin, app image, browser MCP.

## Out of scope

- Bun/lockfile packages in `extensions/canvas` and `docker/browser`: covered by Dependabot and left to it.
- `@openchamber/sdk` 2.2.0 -> 2.3.1: the SDK's API surface is unchanged between those versions, so this is a mechanical pin bump for Dependabot.
- Upstream OpenChamber release adoption: the release pipeline already discovered and built 2.3.1; no action needed.

## Status

Fix prepared for review. No merge, push to `main` or rollout. `skip_specs` applies: no implemented requirement changes.
