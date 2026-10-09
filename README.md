# OpenChamber build repository

This repository builds the OpenChamber web image and standalone distroless `openchamber-browser` MCP image. It also ships the Rembric OpenCode V2 plugin. The Agent Browser guest extension is archived in source, not packaged or used on Core. Host Compose files, credentials and application data live outside this repository.

## Layout

| Path | Purpose |
| --- | --- |
| [`docker/`](docker/README.md) | App and browser image targets, release automation, checks and local build instructions |
| [`browser/`](browser/README.md) | Active standalone Chromium MCP package, no extension panel or guest API |
| [`extensions/agent-browser/`](extensions/agent-browser/README.md) | Archived extension source, not deployed |
| [`extensions/rembric/`](extensions/rembric/README.md) | Rembric OpenCode V2 plugin and its standalone build/install scripts |
| `.github/workflows/build.yml` | GitHub Actions workflow; GitHub requires workflows to remain here |
| `NOTICES.md` | Third-party attribution for the image and both packages |

`extensions/agent-browser` is historical OpenChamber guest source. It must not be installed on Core without fresh operator authorization. Rembric is an active OpenCode V2 plugin and never appears in OpenChamber's extension list.

The repository is public, so GitHub also makes the linked `ghcr.io/miloszkolber/openchamber` package public. The image release checks record this expectation. Never commit host configuration or secrets.

## Build and release

See [`docker/README.md`](docker/README.md) for image contents, release behavior, verification and local commands. Package-level build and install instructions are in each extension's README.

Deployment is manual and lives in the host repository's `docker/openchamber`. Publishing or promoting an image never restarts a running container.
