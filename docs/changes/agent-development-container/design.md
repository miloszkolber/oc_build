# Design: Agent development container

## Technical approach

A new `docker/devcontainer/` context holding a Dockerfile, an image check script
and a README. The image is built once and run many times with the repository
mounted read-write and two named cache volumes for package managers and build
output.

The structural precedent is `docker/openchamber/Dockerfile`, which already
demonstrates the pattern this repository uses: a tools stage that installs
packages and copies binaries with their shared-library closure via `cp -a
--parents` plus an `ldd` walk, a strict `patch --fuzz=0` discipline, and a
`--network=none` regression run during the build. Reusing that shape keeps one
build idiom in the repository instead of two.

## Decisions

### Decision: A separate context, not a new stage in an existing image

The development container needs a shell, a package manager and a build
toolchain. The published images deliberately contain none of those. Adding a
stage to either published image would either widen the published image or fork
its build in a way that makes the published artifact harder to reason about.

A separate context keeps the published images untouched and makes the
development image's purpose obvious from its path.

### Decision: Debian bookworm-slim base, same as the published images

Using the same base family as the published images means the toolchain's
library closure matches what the runtime stages expect. It also means one base
version to watch, rather than three.

The base is pulled through `mirror.gcr.io` like the other two images, so a
runner rate limit does not fail the build.

### Decision: Cache volumes over cache mounts baked into the image

Two named volumes, one for Bun's global cache and one for Docker's build cache,
mounted at stable paths. The image itself stays small and stateless; the caches
are an operator concern and survive image rebuilds.

### Decision: Docker CLI, not Docker-in-Docker

The container gets the Docker CLI and reaches the host daemon over the mounted
socket only when the operator explicitly opts in. The default run does not mount
the socket, because a build agent does not need to build images to run tests,
and the browser image's hardening stance is a useful default to keep.

### Decision: CI parity as a contract, not a plan

The workflows already run `bun install --frozen-lockfile`, `bun test` and the
package step. The development container's entry points are those same commands.
Nothing new is invented for the container that CI does not also run.

## Deliberately not done

- No rootless or nested container runtime. The socket is opt-in and the default
  is no Docker access.
- No language toolchains beyond what the repository's builds consume. A generic
  polyglot image would grow without a consumer.
- No baked credentials, no registry login and no host home directory mount.
- No separate development image for the browser package. It builds with the same
  toolchain.

## File changes

| Path | Change |
| --- | --- |
| `docker/devcontainer/Dockerfile` | New. Tools stage plus runtime stage, pinned base through the cache |
| `docker/devcontainer/entrypoint.sh` | New. Dispatches the documented build, test and package commands |
| `docker/devcontainer/check-image.mjs` | New. Verifies each toolchain resolves and each entry point runs |
| `docker/devcontainer/README.md` | New. Build and run commands, mount points, entry points |
| `docker/devcontainer/.dockerignore` | New. Keeps `node_modules` and build output out of the context |
| `docs/changes/agent-development-container/specs/dev-container/spec.md` | New capability spec, created by this change's delta |
| `.github/workflows/devcontainer.yml` | New. Weekly build plus a pull-request parity check, or an added job if the maintainer prefers fewer workflows |

## Risk

The main risk is drift: a toolchain version in the image diverges from what CI
uses. Mitigation is to pin the Bun version to the same string the workflows use
and to have the parity job fail when they differ, rather than relying on a
comment to keep them aligned.
