# Agent development container

Use for builds, tests, dependency installation, packaging and project dev servers.
The host launcher is `sandbox`. Project reads and authored edits may use native
file tools. Run development commands inside the container, not on the host.

## Run a command

1. Enter the actual project or worktree under one of the launcher's configured
   workspace roots. The launcher rejects other physical working directories.
2. Run `sandbox run -- <command>`. For shell syntax use
   `sandbox run -- sh -lc '<commands>'`. Exit status is the command's status.
3. Leave dev servers in a foreground sandbox command launched with the shell
   tool's background mode. Stop the launcher when done. Detached child processes
   are not durable services and are stopped when their container exits.
4. Use browser MCP for visual QA. A container dev server needs a published port
   to be reachable from the host/browser. Use the launcher's scoped port option
   documented in the package README, not a host-installed runtime or new browser.

```sh
sandbox run -- bun install --frozen-lockfile
sandbox run -- bun test
sandbox run -- sh -lc 'CGO_ENABLED=0 go test ./... && go vet ./...'
sandbox run -- uv run --python 3.12 python -m unittest discover
sandbox run -- docker build -t project:check .
```

## Storage and boundaries

- Package caches persist at `/cache`. Project dependency trees, virtual
  environments and generated outputs remain project-owned. A shared package
  cache is not one interchangeable dependency tree for all projects.
- HOME, TMPDIR and XDG paths are private per-run scratch. Put deliverables and
  retained evidence in project or approved durable paths, not scratch.
- The launcher runs non-root with writable host project/home/data mounts.
  It is a reproducible toolkit, not a hostile-code security boundary.
- Container Docker commands use rootless Docker, not production Docker. Bind
  sources for sibling containers must use host-visible absolute paths. `/cache`
  and `/tmp` inside the toolkit are aliases, not host bind-source paths.
- Native file tools, host service operations and deployment are distinct from
  build commands. Do not change the host default Docker context.

## Add a missing tool

1. Check the project lockfile, runtime requirements and current image. Do not
   use host package managers, global installers or host `/usr/local/bin` to
   supply a development dependency.
2. Record reusable runtimes/CLIs in `oc_build/docker/sandbox` Dockerfile, README
   and image check. Project libraries belong in project manifests/lockfiles
   and install inside the container using persistent caches.
3. Follow `openspec/README.md` and the capability spec. Use a scoped change for
   nontrivial behavior. Preserve version pins and licenses for image inputs.
4. Rebuild using the authorized host image build/deployment procedure, run the
   image and launcher checks, then verify the real consuming build/test. An
   image built in rootless Docker is not automatically available to the host
   runtime that launches `sandbox`.
5. Update this reference only if invocation changes. The tool inventory belongs
   to the image source and README, not a competing skill inventory.

Commands and deployment: the sandbox image README in the project repository and
the `openchamber-sandbox` service section of the local deployment docs. If source/image or the rootless endpoint
is missing, report and repair through those owners. Do not fall back to
installing development tooling on the host.
