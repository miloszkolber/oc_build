# Review evidence

Date: 2026-10-11. Reviewed all sandbox source/deployment/guidance delivered in
this conversation. Three passes: requirements/source, live behavior, assembled
deployment and documentation. No unrelated Canvas/browser branch merge.

## Confirmed repairs

- The toolkit image was absent from the host runtime at review start. Rebuilt
  from this worktree, not a stale tag. Offline image checks include pinned
  OpenSpec 1.14.1, recorded in the image rather than installed on the host.
- The outer launcher inherited Docker context. It now explicitly uses
  `/var/run/docker.sock` while the inner CLI uses the rootless socket. Verified
  with both DOCKER_CONTEXT and DOCKER_HOST pointing to invalid targets.
- Age-only cleanup could remove an old active run. Run locks now protect it.
  Locks are not inherited by the Docker client, so SIGKILL permits eventual
  orphan cleanup instead of indefinitely pinning the scratch directory.
- Signal handling now stops the named container before removing scratch.
  If Docker cleanup cannot be confirmed, scratch is retained.
- Dev-server networking was missing. Explicit host:container ports publish
  only on loopback. No default exposed ports or host networking were added.
- Removed the second source copy of the launcher from the host repository.
  Installation uses canonical image-repo source or retains the deployed copy.
- Previous wording overstated version pins and shared BuildKit caches. Main
  spec and README distinguish mutable tags, package caches, project dependency
  trees and rootless Docker build storage.

## Executed checks

- Image build and offline check pass, including OpenSpec version and pnpm store.
- Launcher and documentation regressions run with Node's built-in test runner
  inside the image. They cover status, explicit endpoint, identity/cwd rejection,
  loopback ports, TERM, SIGKILL recovery, active-lock cleanup and failed cleanup.
- Installed launcher matches canonical source. Rootless Docker and cleanup
  timer are active. No OpenCode/app/browser service restart was needed.
- Submarine: `CGO_ENABLED=0 go test -count=1 ./...` and `go vet ./...` pass.
- Gate: Go tests and repeated builds pass. Warm builds measured 0.092/0.090 s.
- Canvas: frozen dependency installation, all 37 tests, build and ZIP packaging
  pass. The earlier `react/jsx-dev-runtime` error was a missing dependency
  installation, not a source defect. No Canvas code was changed.
- An independent empty Canvas dependency tree installed all 127 packages in
  393 ms with Docker network disabled, reusing the persistent Bun cache.
- A pnpm project installed once, then installed offline from an empty dependency
  tree with zero downloads using the shared store. The ineffective old
  npm_config_store_dir environment variable was removed.
- Rootless Docker built the real gate image and ran an Alpine probe with
  network disabled. Managed Python 3.12 resolves from persistent uv storage.
- A real HTTP server was reached on `127.0.0.1:18765`. Its scratch was aged two
  days while active. Cleanup preserved the server and scratch. TERM returned
  143 and removed both. The user timer removed an unlocked stale fixture.
- A real launcher killed with SIGKILL returned 137 and left an orphan. After
  aging its scratch, cleanup removed the orphan container and scratch. Both the
  real check and the regression verify that the Docker client does not inherit
  the run lock.
- `sudo sandbox run -- id -u` returns 1000. Root UID/GID overrides are rejected.
- Spec checker and OpenSpec strict validation pass. These check documentation
  structure, not runtime correctness. Runtime evidence is listed separately.
- The final launcher/documentation suite has nine passing tests. No leftover
  toolkit containers or run directories remain after verification.
- Main requirements were compared with the delta and matched exactly. The
  change was archived with `--skip-specs --yes` after manual merge. Both the
  local checker and strict OpenSpec validation passed after archive.

## Limits and remaining integration

Hosted Actions/registry publication are not claimed. The branch has not been
merged or pushed to main. Its CI commands were exercised locally. Unrelated
Canvas/browser changes on bright-heron remain untouched. The documentation
foundation here follows its accepted workflow, with a sandbox capability spec.

No automatic Docker-image/cache pruning was added: this could delete useful
build artifacts. Persistent caches are regenerable but intentionally retained.
Host tools needed by unrelated services were not uninstalled. Native OpenCode
continues on the host. Guidance changes route future development tooling into
the container, not a new shell containment policy.
