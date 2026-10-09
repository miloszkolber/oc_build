# OpenChamber build repository

This repository builds the OpenChamber web image and standalone distroless `openchamber-browser` MCP image. It also ships the Rembric OpenCode V2 plugin. The custom Agent Browser guest extension has been removed. Use OpenChamber's native desktop browser panel for interactive browsing. Host Compose files, credentials and application data live outside this repository.

[Visual-coding parity and roadmap contracts](docs/visual-coding.md) retain the Codex/Cursor goals, tool choices and paused design phases. Core's host `docker/openchamber/PLAN.md` owns status and priority.

[Runtime reliability boundaries](docs/reliability.md) covers external workspace paths, native search projection and minimal feature prerequisites.

## Layout

| Path | Purpose |
| --- | --- |
| [`docker/openchamber/`](docker/openchamber/README.md) | App and browser image targets, release automation, checks and local build instructions |
| [`docker/browser/`](docker/browser/README.md) | Active standalone Chromium MCP package, no extension panel or guest API |
| [`extensions/rembric/`](extensions/rembric/README.md) | Rembric OpenCode V2 plugin and its standalone build/install scripts |
| `.github/workflows/build.yml` | GitHub Actions workflow; GitHub requires workflows to remain here |
| `NOTICES.md` | Third-party attribution for the image and both packages |

Rembric is an active OpenCode V2 plugin and never appears in OpenChamber's extension list. The native desktop panel and standalone browser MCP are independent browsers, not a shared extension provider.

The repository is public, so GitHub also makes the linked `ghcr.io/miloszkolber/openchamber` package public. The image release checks record this expectation. Never commit host configuration or secrets.

## Build and release

See [`docker/openchamber/README.md`](docker/openchamber/README.md) for image contents, release behavior, verification and local commands. Package-level build and install instructions are in each extension's README.

Deployment is manual and lives in the host repository's `docker/openchamber`. Publishing or promoting an image never restarts a running container.
