# Agent sandbox image

This directory owns the agent dev sandbox: a build/test image agents run
commands in so a task does not depend on whatever toolchain happens to be
installed on the host. The standalone browser image (`../browser`) stays
separate and distroless; this image is deliberately not distroless because a
dev image needs a shell and package managers.

Source lives here in `oc_build`. Host deployment (launcher install, rootless
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
| OpenSpec 1.14.1 | `@fission-ai/openspec@1.14.1` | spec-driven change validation |

These are versioned tags, not immutable digest pins. Mutable tags and Debian
package resolution mean the build is not bit-reproducible. The build inventory
records the versions actually assembled.

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
| `PNPM_STORE_DIR` (image wrapper) | `/cache/pnpm-store` | pnpm store |
| `GOPATH` / `GOMODCACHE` / `GOCACHE` | `/cache/go`, `/cache/go/mod`, `/cache/go/build` | Go workspace/module/build |
| `PIP_CACHE_DIR` | `/cache/pip` | pip wheels |
| `UV_CACHE_DIR` / `UV_PYTHON_INSTALL_DIR` | `/cache/uv{,/python}` | uv cache and managed Pythons |

`GOTOOLCHAIN=local` stops Go from silently downloading a second toolchain when
a `go.mod` asks for a newer patch version; a mismatch fails explicitly instead.

**Ephemeral, per-run, auto-wiped** — `HOME`, `TMPDIR` and `XDG_*` point at a
scratch directory that the wrapper creates and deletes around each command.
Chromium profiles, `node-compile-cache` and probe output land there, not on the
host.

## Entry point

`sandbox run [--publish host-port:container-port] [--] <command...>` launches the image with the shared cache and a
fresh scratch directory. The container identity is pinned to uid/gid 1000
(`SANDBOX_UID`/`SANDBOX_GID` override) rather than taken from the caller, so
`sudo sandbox run` cannot hand the sandbox host-root write access to the mounts.

Behaviour worth knowing:

- The working directory must be under `/repo`, `/home/core` or
  `/data/.db/openchamber`; anything else fails with a clear error instead of
  silently running against the container's own filesystem.
- All three roots are mounted read-write at their host paths.
- Containers run with `--init` (reaps orphans) and `no-new-privileges`.
- `HOME` is the per-run scratch directory, so the host `~/.gitconfig` and
  `~/.npmrc` are reached through `GIT_CONFIG_GLOBAL` and `npm_config_userconfig`
  instead. Git commits work inside the sandbox.
- The scratch directory is removed when the wrapper exits, including on
  SIGINT/SIGTERM/SIGHUP. A SIGKILL or host reboot leaves a directory behind; the
  daily cleanup timer removes unlocked leftovers older than 24 hours. Active
  runs hold a lock, so their scratch is preserved regardless of age.
- That directory is mode `0700`, not the usual `1777`. Hosts that refuse an
  other-writable state hierarchy — submarine rejects rename-guarded capture
  recovery when a state path is world-writable — fail otherwise, and the sandbox
  runs everything as one uid, so a private `/tmp` loses nothing.

The wrapper also mounts the **rootless** Docker socket
(`/run/user/<SANDBOX_UID>/docker.sock`, read-only) and sets `DOCKER_HOST` when
it exists, so the sandbox can build and run images without ever touching the
host's rootful socket. The image does not include the wrapper; the installed
copy is `/usr/local/bin/sandbox`.

## Boundaries

The sandbox is a build/test convenience, not a security boundary. It shares the
host user's files, and the rootless Docker socket lets a container bind-mount
host paths as uid 1000 — that is the intended price of building images there.
Treat host credentials reachable under the mounted roots as exposed to whatever
runs inside the sandbox.

Host deployment (launcher install, rootless daemon, cleanup timer) is in the
host repository at `/home/core/docker/sandbox`.

## Runtime routing and dev servers

The outer launcher explicitly uses `/var/run/docker.sock`, independent of host
Docker context or environment. This is the host runtime for the toolkit image,
not the endpoint available inside it. Rootless Docker owns project build images
and BuildKit caches separately. Dockerfile package downloads do not automatically
reuse the toolkit's `/cache`. Use BuildKit cache mounts in consuming Dockerfiles.

For browser QA, publish only the required loopback port and bind the container
server to `0.0.0.0`:

```sh
sandbox run --publish 5173:5173 -- bun run dev --host 0.0.0.0
```

Stop the foreground launcher when finished. It removes its named container
before deleting scratch. Deliverables belong in project paths, not `/tmp`.
`sandbox clean` is the timer's lock-aware crash recovery entry point. It never
prunes Docker images, caches or authored project files.

New reusable development tools belong in this Dockerfile, README and image
check. Project libraries belong in project manifests/lockfiles. Do not install
new development tools on the host. See the workspace sandbox reference.

## Build locally

```sh
docker build -t openchamber-sandbox:check docker/sandbox
docker run --rm -i --network none --entrypoint bash openchamber-sandbox:check \
  /usr/local/share/sandbox/check-image.sh
docker run --rm --network none --volume "$PWD:/repo" --workdir /repo \
  --entrypoint node openchamber-sandbox:check --test docker/sandbox/sandbox.test.mjs
```

The build runs the same `check-image.sh` with `--network=none`, so a broken
toolchain or cache wiring fails the build rather than a later run. Content size
is about 395 MiB (`docker image inspect`); the uncompressed layer
set is about 1.68 GB, dominated by the apt build tools and the Go toolchain.

Publication: `.github/workflows/sandbox.yml` builds, checks and publishes
`ghcr.io/<owner>/openchamber-sandbox` on `main` pushes touching this directory.
Pull requests run the same checks without publication. Hosted CI results must
be reported separately from local runs of these same commands.
