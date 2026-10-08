# OpenChamber web image

This directory owns everything used to build and publish the OpenChamber web image. The host deployment is maintained separately in the host repository's `docker/openchamber`.

## Contents

- `Dockerfile`: distroless OpenChamber image with the upstream release bundle, git, bash, Chromium and the bundled Agent Browser guest package; the build runs the browser-gated suite against the same Debian Chromium packages before staging the runtime closure.
- `entrypoint.sh`: waits for the external OpenCode server, then serves the web bundle.
- `self-update.patch`: disables the in-app update checker and installer.
- `openchamber-licence.txt`: upstream OpenChamber license copied into the image.
- `check-image.mjs`: streamed into a restricted, network-disabled container to verify the image and exercise the real browser/provider/MCP handoff.
- `releases.mjs` and `latest.mjs`: upstream release discovery and GHCR publication helpers.
- `*.test.mjs`: contract tests for release discovery and `latest` promotion.
- `.dockerignore`: limits the primary image build context to the Dockerfile inputs. The Agent Browser package enters through a separate, explicit named build context.

## Images and release flow

Images are built from the upstream `openchamber-web-<version>.tgz` release asset. Each release is published as the immutable tag `ghcr.io/miloszkolber/openchamber:<version>-r<releaseId>`; the newest stable release is also promoted to `latest`. Prereleases build but never become `latest`.

The GitHub Actions workflow checks upstream releases hourly, rebuilds the newest stable image weekly to refresh bundled OS/browser security updates, and also supports manual dispatch. It fully paginates upstream releases, so a missed poll catches up. Relevant pushes run the release, plugin and browser-guest checks; a push-triggered image build republishes the newest stable release. The workflow also uploads the Rembric bundle as a separate artifact.

To republish a different already-published release:

```sh
gh workflow run build.yml -f release_id=403254044 -f rebuild=true
```

Rebuild replaces that release's canonical tag after the image passes the same checks.

The runtime image is distroless: no package manager, shell utilities or npm. Git, bash and Chromium are copied in with their runtime dependencies because OpenChamber's source-control features run git, the web terminal spawns a shell, and the bundled Agent Browser guest drives a server-owned browser. The OpenCode binary is not included; the host mounts it and sets `OPENCODE_BINARY`.

The extension source and installable archive are baked into `/opt/openchamber/extensions/agent-browser`; the archive is `/opt/openchamber/extensions/agent-browser/openchamber-agent-browser-1.0.0.zip`. It is not auto-installed or auto-approved. In **Settings → Extensions**, enter that absolute server path, install it, explicitly approve **Run a local service**, then select **Agent Browser** as the Browser provider. Service approval is a trust decision rather than an OS sandbox: the relay service runs in the OpenChamber application container under its user and mount access.

The broker entrypoint is `/opt/openchamber/extensions/agent-browser/broker/main.js`; the default web entrypoint does not start it. Run a separate instance of the same image with no application mounts or credentials, read-only root, UID 1000, all capabilities dropped, `no-new-privileges`, an init process, a bounded `/tmp` tmpfs, and `shm_size: 512m`. Set `OPENCHAMBER_BROWSER_NO_SANDBOX=1` only on this isolated sidecar; this is the authorized Chromium sandbox tradeoff for the locked-down container, not a general extension default. The browser path is fixed to `/usr/lib/chromium/chromium` in the image config. The broker requires `OPENCHAMBER_BROWSER_MCP_TOKEN` and exposes authenticated MCP on loopback port 3000. Its separate guest relay on loopback port 3001 remains unauthenticated but path-limited; do not publish or forward either port. The MCP service and surface relay share one temporary browser profile. There is no idle expiry: browser state remains until broker shutdown or failure, and controlled shutdown removes the profile. A broker restart or crash starts with an empty profile; cookies are intentionally not persistent.

Create a private environment file for the isolated broker and give the same token to the native OpenCode service using its existing secret-management path. Do not put the token in source control, an image, a URL, or the MCP configuration value:

```sh
install -d -m 700 /etc/openchamber-browser
umask 077
printf 'OPENCHAMBER_BROWSER_MCP_TOKEN=%s\n' "$(openssl rand -hex 32)" > /etc/openchamber-browser/browser.env
```

On the Linux host, a parallel evaluation can use the existing image without mounts or credentials. Keep MCP on a temporary port while Obscura owns 3000:

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

The host-networked container binds both services to `127.0.0.1`; do not add published ports. The OpenChamber guest service can reach the relay at `127.0.0.1:3001` when it shares the host network namespace.

Configure OpenCode V2 under `mcp.servers` with the secret supplied in its service environment. Use port 3002 for parallel evaluation while Obscura owns 3000; switch to 3000 only during an approved cutover:

```jsonc
{
  "mcp": {
    "servers": {
      "agent-browser": {
        "type": "remote",
        "url": "http://127.0.0.1:3002/mcp",
        "oauth": false,
        "headers": {
          "Authorization": "Bearer {env:OPENCHAMBER_BROWSER_MCP_TOKEN}"
        }
      }
    }
  }
}
```

After the native OpenCode service receives the environment variable in an approved change window, verify `opencode mcp list` reports the server connected. OpenChamber agents use this same MCP entry through the external OpenCode service; the panel's approved guest service talks to port 3001 and shares the broker's browser state.

Images use mutable base-image and dependency resolutions, so builds are not bit-reproducible. `OPENCHAMBER_ASSET_SHA256` optionally pins the release asset's SHA-256.

`/usr/share/openchamber/browser-build.json` records the source revision build argument, exact Chromium version, and installed Chromium, font, and certificate package versions. The image manifest digest is produced after building/pushing and is checked by the release workflow; it cannot be embedded into its own image. For a local candidate, record the result of `docker image inspect <tag> --format '{{.Id}}'` alongside the build log.

## Local build

From the repository root, build with `docker/` as the primary context so host data, extension sources and other repository content cannot enter the image. The named context adds only the Agent Browser package source:

```sh
source_hash=$(find docker extensions/agent-browser -type f \
  ! -path '*/node_modules/*' ! -path '*/dist/*' ! -path '*/artifacts/*' \
  ! -name config.json ! -name '.env*' -print0 | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)
docker build -t openchamber:2.1.1 \
  --build-context agent-browser=extensions/agent-browser \
  --build-arg OPENCHAMBER_VERSION=2.1.1 \
  --build-arg "OPENCHAMBER_SOURCE_REVISION=tree-sha256:$source_hash" \
  docker

timeout 180 docker run --rm --interactive --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp:exec,size=512m,mode=1777 --shm-size=512m \
  --env EXPECTED_VERSION=2.1.1 \
  --entrypoint node openchamber:2.1.1 --input-type=module < docker/check-image.mjs
```

From the repository root, run the release contract tests with Node or the repository's pinned Bun:

```sh
node --test docker/releases.test.mjs docker/latest.test.mjs
# or: bun test docker/releases.test.mjs docker/latest.test.mjs
```

The image build runs all extension tests with the exact Debian Chromium/font/runtime packages used in the final image; `OPENCHAMBER_BROWSER_TEST_NO_SANDBOX=1` is limited to that ephemeral test stage. The final image itself remains distroless. `check-image.mjs` verifies the baked version, layout, non-root user, working git and shell, extension archive/config, browser build metadata, runtime-module syntax and disabled update routes. It then starts the packaged broker and guest service under the same read-only/non-root/capability-dropped container settings, launches Chromium, and exercises authenticated MCP initialization/tools, the provider, a rendered panel frame and input handoff, same-page cookies/history, MCP console/network diagnostics and PNG screenshots, unauthorized-request refusal, and allowed versus denied private origins. It also verifies controlled shutdown removes the temporary profile and Chromium processes. This is a local fixture test; it does not approve a real private-network origin or prove a production deployment.

The GitHub workflow is `.github/workflows/build.yml`, which GitHub requires to remain in that path. Deployment is not part of the image build: publishing, including promoting `latest`, never restarts a running container.
