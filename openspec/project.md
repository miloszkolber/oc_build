# Project context

## Scope

`oc_build` packages an upstream OpenChamber web release, a standalone Chromium
MCP server, an agent development sandbox, a Canvas panel and a Rembric OpenCode
V2 plugin. Repository renaming did not rename published products.

| Deliverable | Source | Artifact |
| --- | --- | --- |
| Web app | `docker/openchamber/` | `ghcr.io/miloszkolber/openchamber` |
| Browser MCP | `docker/browser/` | `ghcr.io/miloszkolber/openchamber-browser` |
| Agent sandbox | `docker/sandbox/` | `ghcr.io/miloszkolber/openchamber-sandbox` |
| Canvas | `extensions/canvas/` | `openchamber-generative-canvas-<version>.zip` |
| Rembric plugin | `extensions/rembric/` | Self-contained `dist/rembric.js` |

The agent sandbox in `docker/sandbox/` provides container toolchains, shared
dependency caches and per-run scratch so development does not depend on the host
toolchain. Its contract is
[specs/agent-sandbox/spec.md](specs/agent-sandbox/spec.md). Writable workspace
mounts and rootless Docker are trust grants, not hostile-code isolation.

## Goals and boundaries

- Support one self-hosted OpenChamber shared by an operator and coding agents.
- Reuse native workspace/browser surfaces rather than adding another orchestrator.
- Keep lean images, explicit dependencies and independently runnable build checks.
- Make future changes reviewable through requirements, scenarios and evidence.

The app consumes an **external** OpenCode service. It does not own OpenCode's
native APIs, the desktop client or their feature guarantees. The browser MCP
controls separate Chromium and shares no desktop tabs, cookies or login state.
Canvas presents agent-authored files and never writes them. The Rembric package
is an OpenCode plugin, not an OpenChamber guest extension.

App and browser use distroless Node 22 at UID/GID 1000. The app adds explicit
shell/Git/SSH/process tools. The browser adds Chromium and its dependency closure.
Bun and esbuild are build tooling. Exact versions live in Dockerfiles, manifests,
lockfiles and workflows, not a second inventory here. Mutable base tags, apt and
upstream package resolutions mean builds are **not bit-reproducible**.

## Owners

| Subject | Owner |
| --- | --- |
| Implemented behavior | `openspec/specs/<capability>/spec.md` alongside source |
| Proposed behavior, tasks and evidence | One scoped folder in `openspec/changes/` |
| Build/install/configuration commands | The affected package README |
| Canvas render history | `extensions/canvas/VERIFICATION.md` |
| Host deployment, credentials, recovery | `/home/core/docker/openchamber/` in the host repository |
| Host agent guidance | `/home/core/agents/` |
| Upstream app and desktop behavior | `openchamber/openchamber`, not this build repository |

Publication does not itself deploy. Watchtower or an authorized host rollout
does. Keep tokens out of source, artifacts, URLs and diagnostics. Host mounts,
integration permissions and sandbox access are trust grants, not OS isolation.
