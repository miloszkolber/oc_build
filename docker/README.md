# OpenChamber images

This directory owns image builds, release automation and runtime checks. Core deployment is in the host repository at `docker/openchamber`.

## Active images

- `app`: upstream OpenChamber web release, external OpenCode, Bash/Git, a single BusyBox for basic commands, SSH client and `ps` for terminal cleanup, with their library closure. A UID/GID 1000 `core` identity supports SSH and user lookup. No package manager, Chromium or Agent Browser extension.
- `browser`: standalone `/browser` MCP package at `/opt/browser`, Chromium and its library/font/certificate closure. No OpenChamber app, shell, Git, guest service, panel, extension manifest, ZIP or surface API.
- Both use distroless Node 22, UID 1000 and build-time dependency installation. No runtime downloads.
- `extensions/agent-browser` and the old `browser-panel.css`/surface patch files are archived source. Neither image applies or packages them.

## Publication

App releases use upstream `openchamber-web-<version>.tgz`, with an optional `OPENCHAMBER_ASSET_SHA256` integrity pin. Canonical tags are `<version>-r<releaseId>`, and the newest stable release is promoted to `latest`. Prereleases never become `latest`.

The browser publishes `<browser-package-version>-<source-commit>` and `latest`. Pushes, weekly security rebuilds and manual workflows publish it independently of upstream app releases. Relevant pushes rebuild the newest app release. Core follows both `latest` tags under Watchtower.

The workflow runs isolated image checks before publication. `check-image.mjs` verifies absence of the archived extension in both images. Browser checks exercise real Chromium, 38 MCP tools, responsive layout and color preference, bearer authentication, navigation, screenshot, private-destination policy and shutdown cleanup. App checks cover CLI, Git/shell/basic file commands, SSH/user identity, the exact process-list call used by terminal cleanup, runtime syntax and absence of Chromium.

Pure distroless without any OS tools is not compatible with native terminals, Git SSH remotes, shebang scripts or terminal process cleanup. These small, explicitly consumed tools are the deliberate exception. Project language/package toolchains and optional integration credentials are not all bundled into the web server.

Publishing does not itself deploy a container. Watchtower or an explicit host rollout does that.

## Build locally

From the repository root:

```sh
docker build --target browser -t openchamber-browser:check \
  --build-context browser-package=browser docker
docker build --target app -t openchamber:check \
  --build-context browser-package=browser \
  --build-arg OPENCHAMBER_VERSION=2.2.0 docker

docker run --rm -i --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:exec,size=512m,mode=1777 \
  --shm-size=512m --env IMAGE_KIND=browser --entrypoint node \
  openchamber-browser:check --input-type=module < docker/check-image.mjs
```

For the app check set `IMAGE_KIND=app` and `EXPECTED_VERSION` to its baked upstream version. Record source revision and deployed image IDs. Mutable base/dependency resolutions mean builds are not bit-reproducible.

## Browser operation

Use read-only root, UID 1000, dropped capabilities, no-new-privileges, an init process, bounded executable `/tmp` tmpfs and 512 MB shared memory. Mount only browser configuration, not workspaces or app state. The isolated Chromium sandbox exception remains explicit through `OPENCHAMBER_BROWSER_NO_SANDBOX=1`.

`OPENCHAMBER_BROWSER_MCP_TOKEN` is mandatory. Core uses authenticated loopback MCP on 3002 and its `/health` on the same port. The former guest API on 3001 is removed. Caddy exposes `https://core.mewa.sh:3003/mcp` with the same bearer token. Native OpenCode's MCP key is `browser`.

One temporary profile survives across MCP actions. Shutdown, crash recovery and 30-minute idle expiry remove it. Login persistence is not enabled. Existing destination grants remain enforced. Never put tokens in image layers, source, URLs or logs.

`/usr/share/openchamber/browser-build.json` records source revision, Chromium and relevant Debian package versions. Runtime attribution is under `/usr/share/licenses/browser/` and `/usr/share/licenses/debian/`.
