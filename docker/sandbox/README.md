# Agent sandbox image

This directory owns the agent dev sandbox: a build/test image agents run
commands in so a task does not depend on whatever toolchain happens to be
installed on the host. The standalone browser image (`../browser`) stays
separate and distroless; this image is deliberately not distroless because a
dev image needs a shell and package managers.

Source lives here in `oc_build`. Host deployment (Compose stack, rootless
Docker endpoint, cleanup timer) lives in the host repository under
`docker/sandbox`.

## Toolchains

Copied from pinned upstream images so the runtime needs no package downloader
for them:

| Runtime | Source | Why |
| --- | --- | --- |
| Bun 1.4.2 | `oven/bun:1.4.2` | doop, mewa_ui, oc_build extensions, mewa_sh |
| Go 1.25 | `golang:1.25-bookworm` | `toolkit/*` services, uncanny_lab |
| Node 22 + npm | `node:22-bookworm-slim` base | OpenChamber bundle, rembric, QA tooling |
| pnpm 11.1.2 | `npm install -g` at build | rembric monorepo (turbo) |
| uv 0.13.0 + uvx | `ghcr.io/astral-sh/uv:0.13.0` | Python env/deps, uncanny_lab |
| Docker CLI 29 + compose + buildx | `docker:29-cli` | image builds and `docker compose config` |

Debian apt adds the OS build basics: build-essential, pkg-config, git,
openssh-client, curl, ca-certificates, jq, ripgrep, file, unzip, zip,
xz-utils, tar, patch, less, procps, python3 (with venv/dev).

Chromium is intentionally absent; browser QA uses the `browser` MCP image.

## Storage tiers

**Permanent, shared, regenerable** — one download serves every repository and
every run:

| Env | Path | Tool |
| --- | --- | --- |
| `BUN_INSTALL_CACHE_DIR` | `/cache/bun` | Bun install cache |
| `npm_config_cache` | `/cache/npm` | npm cache |
| `npm_config_store_dir` | `/cache/pnpm-store` | pnpm store |
| `GOPATH` / `GOMODCACHE` / `GOCACHE` | `/cache/go/{,,mod,build}` | Go proxy/module/build |
| `PIP_CACHE_DIR` | `/cache/pip` | pip wheels |
| `UV_CACHE_DIR` / `UV_PYTHON_INSTALL_DIR` | `/cache/uv{,/python}` | uv cache and managed Pythons |

`GOTOOLCHAIN=local` stops Go from silently downloading a second toolchain when
a `go.mod` asks for a newer patch version; a mismatch fails explicitly instead.

**Ephemeral, per-run, auto-wiped** — `HOME`, `TMPDIR` and `XDG_*` point at a
scratch directory that the wrapper creates and deletes around each command.
Chromium profiles, `node-compile-cache` and probe output land there, not on the
host.

## Entry point

`./sandbox run [--] <command...>` launches the image with the shared cache and a
fresh scratch directory, running as the host UID/GID, at the current working
directory, with `/repo`, `/home/core` and `/data/.db/openchamber` mounted at
their host paths. The scratch directory is removed on exit, including on
interrupt.

For the first slice the wrapper is invoked from this directory. A host
`/usr/local/bin/sandbox` shim, the Compose stack and the cleanup timer for
crash leftovers are the next increment.

## Build locally

```sh
docker build -t openchamber-sandbox:check docker/sandbox
docker run --rm -i --network none --entrypoint bash openchamber-sandbox:check \
  /usr/local/share/sandbox/check-image.sh
```

The build runs the same `check-image.sh` with `--network=none`, so a broken
toolchain or cache wiring fails the build rather than a later run.
