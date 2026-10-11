# Project: oc_build

## Goals

These are the outcomes the repository exists to produce, and the standard a
change is measured against.

| Goal | What it means in practice |
| --- | --- |
| One self-hosted OpenChamber shared by a solo operator and coding agents, on one host | Nothing here assumes a fleet, a second operator or a multi-tenant deployment |
| Native desktop surfaces for browsing, review and agent-presented data | Reuse the client's own panels rather than building parallel ones |
| Lean, reproducible images whose dependencies are monitored | Small images, watched base versions and a Dependabot surface that actually covers what the builds consume |
| Agents can build, test and verify without hand-holding | A task's outcome depends on the repository, not on whatever toolchain happens to be installed |

## What this repository is

`oc_build` builds and publishes four deliverables from one repository:

| Deliverable | Source | Published as |
| --- | --- | --- |
| OpenChamber web app image | [`docker/openchamber/`](../docker/openchamber/) | `ghcr.io/miloszkolber/openchamber` |
| Standalone browser MCP image | [`docker/browser/`](../docker/browser/) | `ghcr.io/miloszkolber/openchamber-browser` |
| Canvas panel extension | [`extensions/canvas/`](../extensions/canvas/) | `openchamber-generative-canvas-<version>.zip` |
| Rembric OpenCode V2 plugin | [`extensions/rembric/`](../extensions/rembric/) | `dist/rembric.js`, deployed into OpenCode's plugin directory |

The repository was renamed from `openchamber` to `oc_build`. Product image and
package names deliberately did not change, so published artifacts keep their
identity across the rename.

## Layout

| Path | Purpose |
| --- | --- |
| `docker/openchamber/` | App image, release automation, image checks and local build instructions |
| `docker/browser/` | Active standalone Chromium MCP package, no extension panel or guest API |
| `extensions/canvas/` | File-backed json-render Canvas panel, charts and interactive quick tools |
| `extensions/rembric/` | Rembric OpenCode V2 plugin and its standalone build and install scripts |
| `.github/workflows/` | App, browser and extension publication, plus the plugin bundle job |
| `docs/` | This documentation set: [specs](specs/), [changes](changes/), [explorations](explorations/) |

## Stack and toolchain

| Concern | Current value |
| --- | --- |
| App and browser base | `gcr.io/distroless/nodejs22-debian12`, UID and GID 1000 |
| Build toolchain | Bun 1.4.x, Node's built-in test runner, esbuild (build only) |
| App runtime tools | Bash, Git, one BusyBox, SSH client and `ps`, each with its library closure |
| CI | GitHub Actions, every action pinned to a commit SHA, `persist-credentials: false` |
| Base-image pulls | Google's public `mirror.gcr.io` Docker Hub cache |
| Dependency updates | Dependabot, weekly, for the two Bun directories and GitHub Actions |

Builds are not bit-reproducible. Base images and transitive dependencies
resolve at build time, so record the source revision and the deployed image IDs
with every release.

## Boundaries

These are the constraints any change in this repository has to respect.

| Boundary | Statement |
| --- | --- |
| One operator, one host | Core is a single self-hosted deployment shared by one operator and coding agents. Nothing here assumes a fleet. |
| External OpenCode | The app image serves the web bundle and talks to OpenCode over HTTP. It never bundles OpenCode. |
| Path parity | Workspace paths must exist at the same absolute path inside the container and on the host. See [specs/host-runtime](specs/host-runtime/spec.md). |
| No second orchestrator | Reuse native OpenChamber and existing OpenCode agents. A change that adds a daemon, queue or always-on service needs a concrete unmet need. |
| Browser separation | The standalone Chromium MCP never shares tabs, cookies or logins with the desktop browser panel. |
| Agent surface, not storage | The Canvas panel presents data the agent writes. It never becomes an artifact library. |
| Extensions are not sandboxes | Guest permissions are not an OS sandbox. Chromium and agent QA stay in the separate browser image. |
| Authored data has owners | Lockfiles, designs, canvas files and chat data keep durable owners. Disposable profiles and caches do not replace them. |
| No secrets in artifacts | Tokens never enter image layers, source, URLs or logs. |
| Publication is not deployment | Publishing to GHCR does not deploy a container. Watchtower or an explicit host rollout does. |

## Standing constraints on changes

| Constraint | Reason |
| --- | --- |
| A new abstraction, option or dependency needs a current consumer | This repository stays lean; unused surface is a maintenance cost. |
| Prefer surgical edits over surrounding rewrites | Four deliverables share CI conventions, and drift is expensive. |
| Verification belongs with the work that needs it | Each change's `tasks.md` states how its tasks are checked. A final catch-up group hides gaps. |
| Keep commands runnable locally and in Actions | CI parity is a requirement, not an aspiration. |

## How documentation grows

Specs describe the system as it is today. When a change lands, its delta specs
merge into `specs/` and the change folder moves to `changes/archive/`. Analysis
that has not become a decision lives in `explorations/`, and moves into a change
folder only when it is authorized.

The practical consequence: `specs/` starts complete for the capabilities that
already exist and grows by delta. There is no bulk back-fill pass for code that
nobody is changing, because nothing would keep it honest.
