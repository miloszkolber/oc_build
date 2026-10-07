# OpenChamber build repository

Builds the OpenChamber web image and the Rembric OpenCode plugin. Host Compose, credentials and data live outside this repository.

Tracked in `miloszkolber/openchamber` (public). GitHub propagates that visibility to the linked `ghcr.io/miloszkolber/openchamber` package, so the published images are public too; `EXPECTED_PACKAGE_VISIBILITY` in `releases.mjs` records the expectation so an unintended flip either way fails the build. Never commit host configuration or secrets.

## Layout

| Path | Purpose |
| --- | --- |
| `Dockerfile` | Distroless web image: upstream release bundle plus git and bash |
| `entrypoint.sh` | Waits for the external OpenCode server, then serves the web bundle |
| `self-update.patch` | Disables the in-app update checker and installer |
| `check-image.mjs` | Streamed into a network-disabled container to verify an image |
| `releases.mjs` | Upstream release discovery and GHCR publication helpers |
| `latest.mjs` | Promotes the newest stable release to the `latest` tag |
| `plugin/` | Rembric OpenCode **V2** plugin: vendored upstream protocol plus a V2 adapter |
| `notices.md` | Third-party attribution |

GitHub requires the workflow to stay at `.github/workflows/build.yml`.

## Images

Images are built from the upstream `openchamber-web-<version>.tgz` release asset. Each release is published as the immutable tag `ghcr.io/miloszkolber/openchamber:<version>-r<releaseId>`; the newest stable release is also promoted to `latest`. Prereleases build but never become `latest`.

The workflow runs hourly and on manual dispatch. It fully paginates upstream releases, so a missed poll catches up. A push touching `plugin/**` or the release scripts bundles the plugin instead.

A push that changes `Dockerfile`, `entrypoint.sh`, `self-update.patch` or `check-image.mjs` rebuilds and republishes the newest stable release automatically, so the published image tracks the image definition.

To republish a different already-published release:

```sh
gh workflow run build.yml -f release_id=403254044 -f rebuild=true
```

Rebuild replaces that release's canonical tag after the image passes the same checks.

The runtime image is distroless: no package manager, shell utilities or npm. Git and bash are copied in with their library closure because OpenChamber's source-control features run git and the web terminal spawns a shell. The OpenCode binary is not included; the host mounts it and sets `OPENCODE_BINARY`.

## Local builds

```sh
docker build --file Dockerfile -t openchamber:2.1.1 \
  --build-arg OPENCHAMBER_VERSION=2.1.1 .

timeout 180 docker run --rm --interactive --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp --env EXPECTED_VERSION=2.1.1 \
  --entrypoint node openchamber:2.1.1 --input-type=module < check-image.mjs
```

`OPENCHAMBER_ASSET_SHA256` optionally pins the release asset's SHA-256. Builds are not bit-reproducible: base images and dependency resolutions stay mutable.

## Checks

```sh
node --test releases.test.mjs latest.test.mjs
cd plugin && bun run build
```

`check-image.mjs` verifies the baked version, layout, non-root user, working git and shell, runtime-module syntax, and the disabled update routes. It does not prove bit-reproducibility or compatibility with a running OpenCode version.

The plugin bundle is uploaded as an Actions artifact with a SHA-256 checksum and build metadata. It is self-contained (no `@opencode/plugin` import), so it can be dropped into OpenCode's global plugin directory; `plugin/install.sh` builds and copies it there. The plugin is a thin V2 adapter over Rembric's vendored session protocol; see its [README](plugin/README.md).

GitHub Actions artifacts and the published container package are public, so image pulls need no registry authentication.

## Deployment

Deployment is manual and lives in the host repository's `docker/openchamber`. Publishing an image, including promoting `latest`, never restarts a running container.
