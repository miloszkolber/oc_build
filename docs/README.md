# Documentation

This repository uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) to keep
implemented behavior, proposed changes and verification separate. Start with
[project.md](project.md) for scope and ownership.

| Location | Maintained content |
| --- | --- |
| [specs/](specs/) | Implemented repository contracts, grouped by capability |
| [changes/](changes/) | Scoped work with intent, tasks and evidence. Behavior changes also carry requirement deltas |
| [backlog.md](backlog.md) | Deferred work and branch ownership, not implementation authorization |
| [references/runtime.md](references/runtime.md) | Host integration boundaries and the historical search blocker |
| [config.yaml](config.yaml) | Context and rules for OpenSpec artifact instructions |

## Capability map

| Capability | Implementation and commands | Verification owner |
| --- | --- | --- |
| [App image](specs/app-image/spec.md) | [docker/openchamber](../docker/openchamber/README.md) | Entrypoint regression and app image check |
| [Browser MCP](specs/browser-mcp/spec.md) | [docker/browser](../docker/browser/README.md) | Real Chromium image check |
| [Canvas panel](specs/canvas-panel/spec.md) | [extensions/canvas](../extensions/canvas/README.md) | Unit tests, example validation, [render evidence](../extensions/canvas/VERIFICATION.md) |
| [Rembric plugin](specs/rembric-plugin/spec.md) | [extensions/rembric](../extensions/rembric/README.md) | Bundle export check. Lifecycle needs a running OpenCode/Rembric integration |
| [Release pipeline](specs/release-pipeline/spec.md) | [.github/workflows](../.github/workflows/) | Release/latest tests and pre-publication image checks |

Specs state the contract, not a claim that every scenario has been executed.
Each spec identifies source and checks. Keep runtime evidence dated and scoped.
MCP Chromium checks do not establish native desktop acceptance.

## Working a change

1. Read the affected spec and implementation. Use memory as a lead, not proof.
2. For behavior changes, create `changes/<name>/proposal.md` with why, scope,
   affected capabilities and status. Add `specs/<capability>/spec.md` deltas.
3. Add technical design only for consequential choices. Track small, verifiable
   tasks in `tasks.md`. Keep verification and documentation with the work they check.
4. Review scope before implementation. Revise artifacts as evidence changes.
   A proposal is not permission to deploy, restart services or begin paused work.
5. Verify implementation against scenarios. Record commands, results and gaps
   in `evidence.md`. A checkbox or structural validation is not runtime acceptance.
6. Merge completed deltas into main specs, preserving unaffected requirements.
   Validate the merged specs, then archive with `--skip-specs` under
   `changes/archive/YYYY-MM-DD-<name>/` after review.

Use `## Purpose`, `## Requirements`, `### Requirement: Name`, and
`#### Scenario: Name` in main specs. Requirements use SHALL or MUST and describe
observable outcomes. Scenarios use **GIVEN**, **WHEN**, **THEN** and **AND**.
Delta sections are ADDED, MODIFIED, REMOVED or RENAMED Requirements. MODIFIED
replaces the **whole** requirement, including its retained scenarios.

For acceptance-only or documentation-only work, use `skip_specs: true` in
`.openspec.yaml` rather than inventing a behavior change. Small corrections need
only a reviewed diff and checks. Do not manufacture archive history retrospectively.

## Tooling

OpenSpec discovers a root `openspec/` directory. The tracked `openspec -> docs`
symlink exposes these same files to the CLI without a second documentation tree.
Run from the repository root:

```sh
bun scripts/check-docs.mjs
OPENSPEC_TELEMETRY=0 bun x --bun @fission-ai/openspec@1.14.1 list --specs
OPENSPEC_TELEMETRY=0 bun x --bun @fission-ai/openspec@1.14.1 validate --all --strict
```

After review and **manual delta merge**, archive with:

```sh
OPENSPEC_TELEMETRY=0 bun x --bun @fission-ai/openspec@1.14.1 archive <name> --skip-specs
```

Do not use automatic spec-update archive with this alias on 1.14.1. It fails
its final delta fingerprint check. Creation, instructions, validation and
archive **without** spec updates were exercised in isolated fixtures. See
[review evidence](changes/archive/2026-10-11-review-spec-driven-documentation/evidence.md).
`--skip-specs` bypasses merging, not the requirement to merge and review behavior
deltas first. Never use `--no-validate` to hide an archive failure.

The lightweight check verifies local links, scenario structure, change metadata
and task numbering. The upstream CLI checks its own parsing and validation rules.
Neither verifies implementation. OpenSpec is development tooling, not an image
dependency. No global installation or generated chat commands are required.
The [documentation workflow](../.github/workflows/docs.yml) runs these checks and
their regression tests for relevant documentation and implementation changes.

To scaffold a behavior change with the CLI, run `openspec new change <name>` using
the same pinned `bun x` invocation, then request `instructions proposal --change
<name> --json`. Read `planningHome.root` from that response. Do not assume a
local path if a future store is configured.
