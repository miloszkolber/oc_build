# OpenChamber build repository

This repository builds the OpenChamber web image and ships two things that run inside OpenChamber: the Agent Browser guest extension and the Rembric OpenCode V2 plugin. Host Compose files, credentials and application data live outside this repository.

## Layout

| Path | Purpose |
| --- | --- |
| [`docker/`](docker/README.md) | OpenChamber image definition, release automation, checks and local build instructions |
| [`extensions/agent-browser/`](extensions/agent-browser/README.md) | Agent Browser: guest extension that owns one shared Chromium and serves it to the panel and to MCP |
| [`extensions/rembric/`](extensions/rembric/README.md) | Rembric OpenCode V2 plugin and its standalone build/install scripts |
| `.github/workflows/build.yml` | GitHub Actions workflow; GitHub requires workflows to remain here |
| `NOTICES.md` | Third-party attribution for the image and both packages |

`extensions/` holds two different kinds of package. Agent Browser is an OpenChamber guest extension: OpenChamber installs it, the user approves its local service, and it contributes the browser panel and provider. Rembric is an OpenCode V2 plugin: OpenCode loads it, and it never appears in OpenChamber's extension list.

The repository is public, so GitHub also makes the linked `ghcr.io/miloszkolber/openchamber` package public. The image release checks record this expectation. Never commit host configuration or secrets.

## Build and release

See [`docker/README.md`](docker/README.md) for image contents, release behavior, verification and local commands. Package-level build and install instructions are in each extension's README.

Deployment is manual and lives in the host repository's `docker/openchamber`. Publishing or promoting an image never restarts a running container.
