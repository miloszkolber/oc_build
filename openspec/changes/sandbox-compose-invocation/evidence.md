# Evidence

## Delivered

The sandbox is run through Compose instead of a custom launcher wrapper.

- Deleted `docker/sandbox/sandbox` (the ~100-line host wrapper) and
  `docker/sandbox/sandbox.test.mjs` (its 122-line regression suite).
- `.github/workflows/sandbox.yml`: dropped the launcher regression step, and
  narrowed the image workflow trigger to `docker/sandbox/**` and the workflow
  file. A documentation-only change no longer rebuilds the image.
- `docker/sandbox/README.md`: "Run it" section documents the Compose
  invocation, `--rm`, `-w "$PWD"`, loopback port publishing and the optional
  deployment-local alias. Entry-point, scratch, lock and `sandbox clean`
  sections are replaced by the run-scoped temporary filesystem.
- Workspace sandbox reference (and its in-repo snapshot): invocation and
  boundaries rewritten; Docker is stated as a host-installed tool managed with
  the host's own Docker, compose and buildx.
- `openspec/specs/agent-sandbox` deltas: "Explicit container execution",
  "Run-owned temporary state", "Recorded tool ownership" and "Reviewed image
  publication" updated for Compose execution, run-scoped temporary state and
  host-owned Docker.

## Optimisation from dropping Docker

| Item | Before | After |
| --- | --- | --- |
| Image build stages | 4 (`bun`, `go`, `uv`, `dockercli`) | 3 |
| Published image size | 1.65 GB | 1.45 GB |
| Repo run machinery | wrapper + 122-line test + CI launcher step | Compose service + optional alias |
| Host state | per-run scratch dirs, locks, 24h scan, cleanup timer | one tmpfs per run, nothing host-side |
| Image workflow trigger | `docker/sandbox/**`, `openspec/**`, `scripts/check-docs*` | `docker/sandbox/**`, workflow file |

The image still carries the toolchains and shared caches; only the container
engine and its run machinery are gone.

## Checks

Repository documentation and specification checks, run through the sandbox
service itself:

- `bun scripts/check-docs.mjs`: 23 Markdown files, 0 failures.
- Pinned OpenSpec 1.14.1 `validate --all --strict`: 7 items passed (after the
  delta was corrected to preserve every existing scenario name in MODIFIED
  requirements).

Deployment behaviour, verified through the host Compose service:

- `docker compose config --quiet`: valid.
- `docker compose run --rm -w /repo/oc_build/extensions/canvas
  openchamber-sandbox bun test`: 59 pass, 0 fail, 334 assertions.
- Identity and environment: runs as UID 1000, `HOME=/tmp` on the run tmpfs,
  `/tmp` writable, bun 1.4.2 available.
- Host git/npm passthrough: `git config --get user.email` returns the host
  value; the host config file is reached through `GIT_CONFIG_GLOBAL`.
- Shared cache: `/cache` is mounted and populated (`go`, `npm` present).
- Loopback publish: a server bound to `0.0.0.0:8899` inside a run was reachable
  at `127.0.0.1:8899` on the host; no other port was published.
- No Docker inside: the image reports no `docker`, `podman` or `buildx`
  (already asserted by `check-image.sh`).

CI: the sandbox image workflow rebuilds and publishes on the image-affecting
change; the documentation workflow validates docs. Not verified here: a full
GitHub Actions run for this commit is recorded in the change's final report.

## Limits

The wrapper's clear rejection of an unmounted working directory is gone.
Compose starts the command in the mounted working directory passed with `-w`;
a path outside the mounts is simply not visible. The optional alias does not
accept flags such as `-p` because the service name is fixed at the end of the
alias, so port publishing uses the full Compose command, as documented.
