# Run the sandbox through Compose

## Why

The custom launcher wrapper existed to create per-run scratch, hold run locks,
scan for stale runs, force a Docker endpoint and mount a socket. Dropping the
Docker capability removed the endpoint and socket work. Compose already
provides the remaining mechanics declaratively: service identity, mounts,
working directory, a per-run temporary filesystem, port publishing and
container removal on exit. A ~100-line shell wrapper, its 122-line test file
and a CI step that exercised it are no longer earning their maintenance.

## What Changes

- Delete `docker/sandbox/sandbox` and `docker/sandbox/sandbox.test.mjs`.
- Describe sandbox execution as a Compose service in the package README, with
  a documented optional deployment-local alias for the common case.
- Give each run a private temporary filesystem and remove the container on
  exit, instead of wrapper-managed scratch directories, locks and stale-run
  scanning.
- Record the changed contract in the agent-sandbox requirement deltas.
- Drop the launcher regression step from the sandbox image workflow.
- Document that Docker is a host-installed tool managed directly: container
  builds and Docker commands run on the host, not inside the sandbox.

## Scope

`docker/sandbox/` package sources and checks, the agent-sandbox specification,
the sandbox image workflow, the workspace sandbox reference and its in-repo
snapshot, and the local deployment configuration and docs. No change to the
image contents, the browser or app images, or the Canvas panel. Publication
does not deploy.

## Status

Implemented and verified in this change. See `tasks.md` and `evidence.md`.
