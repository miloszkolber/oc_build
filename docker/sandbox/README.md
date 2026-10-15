# Agent sandbox image

This directory owns the agent dev sandbox: a build/test image agents run commands in so a task does not depend on whatever toolchain happens to be installed on the host. The standalone browser image (`../browser`) stays separate and distroless; this image is deliberately not distroless because a dev image needs a shell and package managers.

Source lives here in `oc_build`. Host deployment is the openchamber-sandbox Compose service plus an optional alias; see the local deployment docs.

## Toolchains

Copied from pinned upstream images so the runtime needs no package downloader for them:

| Runtime | Source | Why |
| --- | --- | --- |
| Bun 1.4.3 | `oven/bun:1.4.3` | doop, mewa_ui, oc_build extensions, mewa_sh |
| Go 1.25 | `golang:1.25-bookworm` | `toolkit/*` services, uncanny_lab |
| Node 22 + npm | `node:22-bookworm-slim` base | OpenChamber bundle, rembric, QA tooling |
| pnpm 11.28.5 | `npm install -g` at build | rembric monorepo (turbo) |
| uv 0.13.0 + uvx | `ghcr.io/astral-sh/uv:0.13.0` | Python env/deps, uncanny_lab |
| OpenSpec 1.14.1 | `@fission-ai/openspec@1.14.1` | spec-driven change validation |

These are versioned tags, not immutable digest pins. Mutable tags and Debian package resolution mean the build is not bit-reproducible. The build inventory records the versions actually assembled.

Debian apt adds the OS build basics: build-essential, pkg-config, git, openssh-client, curl, ca-certificates, jq, ripgrep, file, unzip, zip, xz-utils, tar, patch, less, procps, python3 (with venv/dev).

Chromium is intentionally absent; browser QA uses the `browser` MCP image. Container-image tooling (Docker, compose, buildx) is intentionally absent too: the sandbox provides toolchains, and container builds run on the host runtime. The image check asserts that absence.

## Storage tiers

**Permanent, shared, regenerable** — one download serves every repository and every run:

| Env | Path | Tool |
| --- | --- | --- |
| `BUN_INSTALL_CACHE_DIR` | `/cache/bun` | Bun install cache |
| `npm_config_cache` | `/cache/npm` | npm cache |
| `PNPM_STORE_DIR` (image entrypoint) | `/cache/pnpm-store` | pnpm store |
| `GOPATH` / `GOMODCACHE` / `GOCACHE` | `/cache/go`, `/cache/go/mod`, `/cache/go/build` | Go workspace/module/build |
| `PIP_CACHE_DIR` | `/cache/pip` | pip wheels |
| `UV_CACHE_DIR` / `UV_PYTHON_INSTALL_DIR` | `/cache/uv{,/python}` | uv cache and managed Pythons |

`GOTOOLCHAIN=local` stops Go from silently downloading a second toolchain when a `go.mod` asks for a newer patch version; a mismatch fails explicitly instead.

**Ephemeral, per-run, auto-wiped** — `HOME`, `TMPDIR` and `XDG_*` live on a temporary filesystem the deployment mounts for the run. Chromium profiles, `node-compile-cache` and probe output land there, not on the host, and vanish with the container.

## Run it

The sandbox is a Compose service in the deployment that owns the mounts. Run a command with the deployment's compose file:

```sh
docker compose -f <deployment compose> run --rm -w "$PWD" openchamber-sandbox bun test
```

- `--rm` removes the container and its temporary filesystem when the command exits, and the command's exit status is returned.
- `-w "$PWD"` starts the command in the current directory, so run from inside a mounted root. A path outside the mounts is not visible to the container.
- The service pins the non-root UID/GID and drops capabilities, so running it through `sudo` still does not give the command host-root write access.
- To publish a dev server, pass the port before the service name and bind the server to `0.0.0.0`:

```sh
docker compose -f <deployment compose> run --rm -w "$PWD" \
  -p 127.0.0.1:5173:5173 openchamber-sandbox bun run dev --host 0.0.0.0
```

An optional shell alias makes the common case shorter. It is deployment-local because it names that deployment's compose file and service:

```sh
alias sandbox='docker compose -f <deployment compose> run --rm -w "$PWD" openchamber-sandbox'
```

A deployment that wants the working directory guarded, or flags such as `--publish` passed through, wraps the same Compose command in a small shell function instead of a bare alias. Ports stay on host loopback either way.

Behaviour worth knowing:

- All configured roots are mounted read-write at their host paths.
- Containers run with `--init` (reaps orphans) and `no-new-privileges`.
- `HOME` is on the temporary filesystem, so the host `~/.gitconfig` and `~/.npmrc` are reached through `GIT_CONFIG_GLOBAL` and `npm_config_userconfig` instead. Git commits work inside the sandbox.
- The temporary filesystem is private to the run, so one run cannot see another's scratch and nothing needs host-side cleanup.


The container receives no Docker endpoint: no `DOCKER_HOST`, no socket mount and no Docker CLI.

## Boundaries

The sandbox is a build/test convenience, not a security boundary. It shares the host user's files through the mounted roots. Treat host credentials reachable under those roots as exposed to whatever runs inside the sandbox.

Host deployment (the compose service and the optional alias) is documented in the local deployment docs.

## Docker and dev servers

Docker is a host-installed tool. Run Docker, compose and buildx on the host directly; the sandbox neither ships them nor receives an endpoint. Use the host's configured context and socket for container work.

Docker context or environment. The endpoint used to run the toolkit container is not available inside it. Container builds run on the host directly.

For browser QA, publish only the required loopback port and bind the container server to `0.0.0.0` (see the port example above).

Deliverables belong in project paths, not the temporary filesystem. Nothing needs host-side cleanup: the run's temporary filesystem disappears with its container. This image never prunes Docker images, caches or authored project files.

New reusable development tools belong in this Dockerfile, README and image check. Project libraries belong in project manifests/lockfiles. Do not install new development tools on the host. Container-engine tooling stays out of this image; see the workspace sandbox reference.

## Build locally

```sh
docker build -t openchamber-sandbox:check docker/sandbox
docker run --rm -i --network none --entrypoint bash openchamber-sandbox:check \
  /usr/local/share/sandbox/check-image.sh
docker run --rm --network none --volume "$PWD:/repo" --workdir /repo \
  --entrypoint node openchamber-sandbox:check --test docker/sandbox/sandbox.test.mjs
docker run --rm --network none --volume "$PWD:/repo" --workdir /repo \
  --entrypoint bun openchamber-sandbox:check test scripts/check-docs.test.mjs
docker run --rm --network none --volume "$PWD:/repo" --workdir /repo \
  --entrypoint bun openchamber-sandbox:check scripts/check-docs.mjs
docker run --rm --network none --volume "$PWD:/repo" --workdir /repo \
  --env OPENSPEC_TELEMETRY=0 --entrypoint openspec openchamber-sandbox:check validate --all --strict
```

The build runs the same `check-image.sh` with `--network=none`, so a broken toolchain or cache wiring fails the build rather than a later run. Content size is about 395 MiB (`docker image inspect`); the uncompressed layer set is about 1.68 GB, dominated by the apt build tools and the Go toolchain.

Publication: `.github/workflows/sandbox.yml` builds, checks and publishes `ghcr.io/<owner>/openchamber-sandbox` on `main` pushes touching this directory. Pull requests run the same checks without publication. Hosted CI results must be reported separately from local runs of these same commands.
