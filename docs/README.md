# oc_build documentation

This documentation set follows [OpenSpec](https://github.com/Fission-AI/OpenSpec)
principles. Two directories carry the weight: `specs/` states how the system works
today, and `changes/` holds one folder per proposed modification. Completing a change
merges its delta specs into `specs/` and moves the folder into `changes/archive/`
with a date stamp. `explorations/` holds thinking that has not become a change yet.

The four principles that shape every file here:

```
fluid not rigid         — update an artifact whenever reality changes, no phase gates
iterative not waterfall — specs grow from real changes, not from an initial dump
easy not complex        — the lightest form that stays verifiable
brownfield-first        — deltas describe what changes, never the whole system
```

## Pick your path

| I need to… | Go to |
| --- | --- |
| Understand what this repository builds and why | [project.md](project.md) |
| See what is being worked on right now | [Status by change](#status-by-change) below |
| Learn how a component actually behaves today | [`specs/`](specs/) |
| Review a plan before any code is written | [`changes/<name>/proposal.md`](changes/) |
| Build, run or verify something | the package README in [Document owners](#document-owners) |
| Judge a tool or approach we have not adopted | [`explorations/`](explorations/) |
| Write a new spec or change | [Conventions](#conventions) below |

## The map

```text
docs/
├── README.md                     # this file: the index, status and conventions
├── project.md                    # what the repository is, its layout and its boundaries
├── config.yaml                   # context and rules injected into every new artifact
├── specs/                        # source of truth — how the system works today
│   ├── app-image/spec.md         # OpenChamber web image and its tool exception set
│   ├── browser-mcp/spec.md       # standalone distroless Chromium MCP image
│   ├── canvas-panel/spec.md      # per-conversation read-only presentation panel
│   ├── rembric-plugin/spec.md    # Rembric OpenCode V2 plugin
│   ├── release-pipeline/spec.md  # GitHub Actions, GHCR publication and dependency monitoring
│   ├── host-runtime/spec.md      # external OpenCode boundaries and the search blocker
│   └── visual-coding/spec.md     # agent-surface parity contract and safeguards
├── changes/                      # proposed modifications — one folder per change
│   ├── <change-name>/
│   │   ├── proposal.md           # why, what, impact
│   │   ├── specs/<capability>/spec.md   # delta: ADDED / MODIFIED / REMOVED requirements
│   │   ├── design.md             # technical approach (optional)
│   │   ├── tasks.md              # implementation checklist
│   │   └── .openspec.yaml        # schema and change metadata
│   └── archive/
│       └── YYYY-MM-DD-<name>/    # completed changes, deltas already merged
└── explorations/                 # thinking that is not yet an authorized change
    ├── visual-coding-phases.md   # P2–P6 phase contracts and their authorization gates
    └── visual-tooling-survey.md  # tools reviewed and their disposition
```

## Status by change

Status is a property of a change, not of a folder in `specs/`. An archived change
carries no status: its deltas are already part of the truth.

The vocabulary is fixed, so a status means the same thing in every change:

| Status | Meaning |
| --- | --- |
| In progress | Active now |
| Next | Agreed and unblocked |
| Paused | Needs fresh authorization before it starts |
| Complete | Done, merged and archived |

A status only appears on an open change. Once a change is archived its deltas
are in `specs/`, and the archive entry keeps the reasoning rather than a status.

| Change | Capability | Status |
| --- | --- | --- |
| [accept-canvas-panel-on-desktop](changes/accept-canvas-panel-on-desktop/proposal.md) | canvas-panel | In progress — operator acceptance |
| [app-image-base-version-monitoring](changes/app-image-base-version-monitoring/proposal.md) | release-pipeline | Next |
| [agent-development-container](changes/agent-development-container/proposal.md) | host-runtime | Next |
| [native-agent-integration](changes/native-agent-integration/proposal.md) | host-runtime | Next |
| [visual-qa-handoff](changes/visual-qa-handoff/proposal.md) | visual-coding | Paused — needs authorization |
| [native-search-projection-repair](changes/native-search-projection-repair/proposal.md) | host-runtime | Paused — blocked on an upstream projection |
| [artifact-evidence-retention](changes/artifact-evidence-retention/proposal.md) | release-pipeline | Paused |

### Standing obligations

These are not projects and do not get a change folder. They are conditions that
stay true while the repository lives, and they are enforced by the specs that
state them.

| Obligation | Owner |
| --- | --- |
| Recheck cached base-image availability whenever a base version changes | [specs/app-image](specs/app-image/spec.md), [specs/browser-mcp](specs/browser-mcp/spec.md). Monitoring mechanism proposed in [app-image-base-version-monitoring](changes/app-image-base-version-monitoring/proposal.md) |
| Extend agent guidance only when a new panel genuinely needs agent-facing rules | [specs/visual-coding](specs/visual-coding/spec.md) |
| Revisit native search only with a supported pre-serialization projection | [specs/host-runtime](specs/host-runtime/spec.md), with the acceptance gate in [native-search-projection-repair](changes/native-search-projection-repair/proposal.md) |

## Document owners

One owner per subject. A file outside `docs/` owns the commands for its own
component; `docs/specs/` owns what that component must do.

| Path | Owns |
| --- | --- |
| `docs/specs/**/spec.md` | Current behavior of one capability |
| `docs/changes/**` | One proposed modification and its checklist |
| `docs/explorations/**` | Analysis and options that are not yet a decision |
| `docs/project.md` | Repository identity, layout and boundaries |
| [`docker/openchamber/README.md`](../docker/openchamber/README.md) | App image contents, build commands, browser operation |
| [`docker/browser/README.md`](../docker/browser/README.md) | Browser image build and MCP tool routing |
| [`extensions/canvas/README.md`](../extensions/canvas/README.md) | Canvas catalog, agent contract, build and install |
| [`extensions/canvas/VERIFICATION.md`](../extensions/canvas/VERIFICATION.md) | Executed Canvas checks per version |
| [`extensions/rembric/README.md`](../extensions/rembric/README.md) | Plugin build, install, configuration and rollback |
| [`README.md`](../README.md) | Repository entry point and layout |

External owners that this repository does not control, and that its specs must
stay consistent with:

| Owner | Owns |
| --- | --- |
| `/home/core/docker/openchamber/` | Core deployment, credentials, operation and recovery |
| `/home/core/agents/AGENTS.md` | Always-loaded agent routing and the evidence boundary |
| `upstream openchamber/openchamber` | The app the image bakes, and its patch points |

## Conventions

Requirements and scenarios follow the OpenSpec format so a reader can tell a
contract from prose at a glance.

| Element | Rule |
| --- | --- |
| `## Purpose` | One or two sentences on what the capability is for |
| `### Requirement: <Name>` | One observable behavior, stated with SHALL, MUST, SHOULD or MAY |
| `#### Scenario: <Name>` | A concrete case, with GIVEN, WHEN, THEN and AND steps |
| Deltas | `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` |

Writing rules that apply to every file here:

- State behavior, not implementation. Class names, library choices and execution order belong in `design.md`, `tasks.md` or the package README.
- Keep one behavior per requirement. If a requirement needs three "and also" clauses, it is three requirements.
- Name the case in the scenario title, so a reviewer sees what is covered at a glance.
- Use RFC 2119 strength deliberately. SHALL and MUST are non-negotiable. SHOULD allows a justified exception. MAY is optional.
- Keep the lightest form that stays verifiable. Cross-boundary, security, migration and publication changes earn more detail.
- Right-size a change. One intent stated in a sentence. If the proposal reads like a list of unrelated features, split it.
- Update in place instead of adding a parallel file. This set has one owner per subject.
- Write in plain technical language with sentence-case headings and single-level lists.

### Working a change

```text
explore        write or read exploration notes, no code
propose        create changes/<name>/ with proposal.md and its delta specs
review         read the proposal and the deltas before any code is written
apply          work tasks.md, checking items off as they land
sync           merge the deltas into specs/ while the change stays open
archive        move the folder to changes/archive/YYYY-MM-DD-<name>/
```

Dependencies between artifacts are enablers, not gates. Discover during
implementation that the design was wrong, edit `design.md` and keep going.
Realize the scope should shrink, update the proposal. Nothing locks.

When a change is genuinely different work rather than a refinement, start a new
folder instead of patching the old one. The test is simple: same intent and
more than half the scope overlapping means update. A changed problem, an
exploded scope, or an original that can be marked done on its own means start
fresh.

## Related documentation

- [OpenSpec concepts](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md) — the model this set follows
- [OpenSpec writing guide](https://github.com/Fission-AI/OpenSpec/blob/main/docs/writing-specs.md) — what a strong requirement and scenario look like
- [OpenSpec existing projects](https://github.com/Fission-AI/OpenSpec/blob/main/docs/existing-projects.md) — why specs grow one change at a time
