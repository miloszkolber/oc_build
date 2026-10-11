# Drop Docker from the agent sandbox

## Why

The sandbox exists to provide reproducible development toolchains and shared
caches, not to build or run containers. Carrying the Docker CLI, a rootless
daemon, its socket mount and its separate BuildKit caches adds a second
container engine, a long-running user unit, a 7 GB data root and a privilege
question for a capability nothing depends on. Removing it narrows the sandbox
to what it is actually for and removes host state that must otherwise be
maintained, backed up and reasoned about.

## What Changes

- Remove the Docker CLI, compose and buildx plugins from the sandbox image and
  from its image check and build inventory.
- Stop passing a Docker endpoint into the sandbox container: drop the
  `DOCKER_HOST` environment variable and the rootless socket bind mount from
  the launcher.
- Keep the launcher's explicit host-runtime selection for running the toolkit
  container itself, independent of the caller's Docker environment.
- Record the capability removal in the agent-sandbox requirement deltas.
- Retire the host rootless daemon and its data root; the sandbox no longer
  needs either.
- Remove the in-sandbox container-build example and routing guidance from the
  workspace sandbox reference.

## Scope

`docker/sandbox/` (image, check, launcher), the agent-sandbox specification,
the workspace sandbox reference and its in-repo snapshot, and local host
deployment state. No change to the browser or app images, the Canvas panel or
the standalone browser MCP. Publication does not deploy; the host rollout is
separate and authorized per step.

## Status

Implemented and verified in this change. See `tasks.md` and `evidence.md`.
