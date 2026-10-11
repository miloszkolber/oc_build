# Proposal: Agent development container

## Intent

Builds and tests in this repository currently depend on whatever toolchain
happens to be installed on the host. An agent asked to run `bun test` or build
an image first has to discover whether Bun exists, which version, and whether
Docker is reachable. That makes a task's outcome depend on host state rather
than on the repository.

A dedicated build and test image removes that dependency. An agent runs the same
commands locally and in CI, against a known toolchain, with cache directories
that survive between runs.

## Scope

In scope:

- A base image carrying the toolchains the builds in this repository need.
- Workspace and cache mount points that survive across runs.
- Documented entry points for build, test and package.
- CI parity, so the same commands pass locally and in Actions.

Out of scope:

- Running the built app or browser images inside the development container.
- Any change to what the published app or browser image contains.
- Host service configuration, credentials or deployment topology.
- Replacing the host toolchain for interactive operator work.

## Approach

Follow the pattern already established by the two published images: a
multi-stage build that copies the toolchain with its library closure into a
runtime stage, pinned base images pulled through the `mirror.gcr.io` cache, and
an image check that runs the real commands before anything is considered
working. Reuse `docker/openchamber/Dockerfile` as the structural precedent and
keep this image separate from both published images.

The image needs a shell and a package manager, because it is a development tool
rather than a runtime. That is the deliberate difference from the published
images, and it is why the image is not a candidate for the published app or
browser target.

## Changes

**New capability spec: dev-container**

- From: No specification exists. The roadmap recorded this area as Next with four
  subtasks.
- To: A new capability spec describing the image's toolchain, mount points,
  entry points and CI parity contract.
- Reason: A new deliverable needs a contract before it is built, so the image
  does not drift into a second, undocumented workspace.
- Impact: New spec file. No existing spec changes.

**Dependency on host-runtime**

- From: The host-runtime spec states that project toolchains are feature
  prerequisites rather than web-server contents.
- To: Unchanged. The development container is where those prerequisites live,
  which is consistent with the existing statement.
- Reason: Recording the relationship now prevents a later reader from assuming
  the container is a runtime.
- Impact: None.

## Acceptance checks

| Check | How it is verified |
| --- | --- |
| The image carries the toolchains the repository's builds need | Run the image and check Bun, Node, Docker CLI, Git and ripgrep resolve and report their versions |
| Cached dependencies survive a run | Warm the cache, run a second time, and confirm the install step is a cache hit |
| Workspace writes survive a run | Create a file in the workspace mount and read it back in a second run |
| Documented entry points work | Run each documented build, test and package command from a clean checkout |
| CI parity | The same commands pass in the container and in GitHub Actions |
| The image is not a runtime | Confirm the published app and browser images are unchanged by this change |

## Rollback

Remove the development image and its sources. Nothing in the published images,
workflows or host configuration depends on it, so removing it restores the
previous state exactly. Any cache directory created for it can be deleted with
it.

## Status

Next. Agreed and unblocked.
