# Agent development container

Use for builds, tests, dependency installation, packaging and project dev servers.
Run the sandbox through the deployment's Compose service. Project reads and
authored edits may use native file tools. Run development commands inside the
container, not on the host.

## Run a command

1. Enter the actual project or worktree under one of the deployment's mounted
   roots. A path outside the mounts is not visible to the container.
2. Run the sandbox service with your command. The deployment documents its
   compose file and may provide a short alias:

```sh
docker compose -f <deployment compose> run --rm -w "$PWD" openchamber-sandbox bun test
```

3. The command's exit status is returned and the container is removed on exit,
   including its temporary filesystem.
4. Leave dev servers in a foreground sandbox command launched with the shell
   tool's background mode. Detached child processes are not durable services
   and stop when the container exits.
5. Use browser MCP for visual QA. A container dev server needs a published port
   to be reachable from the host/browser. Pass the loopback port before the
   service name and bind the server to `0.0.0.0`. Do not install a browser or
   runtime on the host.

```sh
docker compose -f <deployment compose> run --rm -w "$PWD" openchamber-sandbox bun install --frozen-lockfile
docker compose -f <deployment compose> run --rm -w "$PWD" openchamber-sandbox sh -lc 'CGO_ENABLED=0 go test ./... && go vet ./...'
docker compose -f <deployment compose> run --rm -w "$PWD" openchamber-sandbox uv run --python 3.12 python -m unittest discover
```

A deployment helper supports only its documented options. One that binds ports
to loopback should reject unsupported leading options rather than forward them
unchecked. Use Compose directly for advanced run options and explicitly bind
published ports to loopback.

## Storage and boundaries

- Package caches persist at `/cache`. Project dependency trees, virtual
  environments and generated outputs remain project-owned. A shared package
  cache is not one interchangeable dependency tree for all projects.
- HOME, TMPDIR and XDG paths live on the run's temporary filesystem. Put
  deliverables and retained evidence in project or approved durable paths, not
  there.
- The service pins a non-root identity with writable host project/home/data
  mounts. It is a reproducible toolkit, not a hostile-code security boundary.
- Docker is a host-installed tool. Manage containers with the host's Docker,
  compose and buildx directly, using the host's configured context and socket.
  The sandbox ships no Docker CLI and receives no endpoint.
- Native file tools, host service operations and deployment are distinct from
  build commands. Do not change the host default Docker context.

## Add a missing tool

1. Check the project lockfile, runtime requirements and current image. Do not
   use host package managers, global installers or host install locations to
   supply a development dependency.
2. Record reusable runtimes/CLIs in the sandbox image's Dockerfile, README
   and image check. Project libraries belong in project manifests/lockfiles
   and install inside the container using persistent caches.
3. Follow `openspec/README.md` and the capability spec. Use a scoped change for
   nontrivial behavior. Preserve version pins and licenses for image inputs.
4. Rebuild using the authorized host image build/deployment procedure, run the
   image check, then verify the real consuming build/test. An image built in a
   separate or rootless Docker context is not automatically available to the
   host runtime that runs the sandbox.
5. Update this reference only if invocation changes. The tool inventory belongs
   to the image source and README, not a competing skill inventory.

Commands and deployment: the sandbox image README in the project repository and
the `openchamber-sandbox` service section of the local deployment docs. If source/image
is missing, report and repair through those owners. Do not fall back to
installing development tooling on the host.
