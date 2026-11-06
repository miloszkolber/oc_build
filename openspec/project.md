# Project context

## Scope

`oc_build` packages an upstream OpenChamber web release and an agent development sandbox. The sandbox includes headless browser tooling for agents. Repository renaming did not rename published products.

| Deliverable | Source | Artifact |
| --- | --- | --- |
| Web app | `docker/openchamber/` | `ghcr.io/miloszkolber/openchamber` |
| Agent sandbox | `docker/sandbox/` | `ghcr.io/miloszkolber/openchamber-sandbox` |

The agent sandbox in `docker/sandbox/` provides container toolchains, shared dependency caches and per-run scratch so development does not depend on the host toolchain. Its contract is [specs/agent-sandbox/spec.md](specs/agent-sandbox/spec.md). Writable workspace mounts are trust grants, not hostile-code isolation.

## Goals and boundaries

- Support one self-hosted OpenChamber shared by an operator and coding agents.
- Reuse native workspace/browser surfaces rather than adding another orchestrator.
- Keep lean images, explicit dependencies and independently runnable build checks.
- Make future changes reviewable through requirements, scenarios and evidence.

The app consumes an **external** OpenCode service. It does not own OpenCode's native APIs, the desktop client or their feature guarantees. The sandbox browser CLI is a separate engine with its own profile; it shares no desktop tabs, cookies or login state.

The app uses distroless Node 24 at UID/GID 1000 and adds explicit shell/Git/SSH/process tools. The sandbox is a non-root Debian development image with language toolchains, shared caches and the Obscura/playwright-core browser CLI. Bun and esbuild are build tooling. Exact versions live in Dockerfiles, manifests, lockfiles and workflows, not a second inventory here. Mutable base tags, apt and upstream package resolutions mean builds are **not bit-reproducible**.

## Owners

| Subject | Owner |
| --- | --- |
| Implemented behavior | `openspec/specs/<capability>/spec.md` alongside source |
| Proposed behavior, tasks and evidence | One scoped folder in `openspec/changes/` |
| Build/install/configuration commands | The affected package README |
| Host deployment, credentials, recovery | Local deployment docs, outside this repository |
| Host agent guidance | Host agent guidance collection, outside this repository |
| Upstream app and desktop behavior | `openchamber/openchamber`, not this build repository |

Publication does not itself deploy. Watchtower or an authorized host rollout does. Keep tokens out of source, artifacts, URLs and diagnostics. Host mounts, integration permissions and sandbox access are trust grants, not OS isolation.
