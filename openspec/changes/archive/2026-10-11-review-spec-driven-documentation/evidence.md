# Review evidence

Reviewed on 2026-10-11 against the bright-heron working tree based on `ad70585`.
This is documentation/source review and local execution, not native desktop
acceptance, a GitHub CI run or deployed-runtime validation.

## Completion audit

| Requested outcome | Evidence |
| --- | --- |
| Review accuracy against implementation | Retained specs link to Dockerfiles, entrypoint/patches, browser policy/runtime/tools, Canvas catalog/renderer/session logic, Rembric adapter/protocol and workflows. Corrected tag mutability, readiness deadline, profile cleanup, plugin defaults and scope checks |
| Minimal but detailed organization | Five implemented capability specs. One backlog replaces speculative change folders. Host reliability is a reference, not repository requirements. Package READMEs retain commands |
| Spec-driven foundation | Root AGENTS.md and README route behavior work through specs, deltas, tasks, evidence and review. Local checks and docs CI enforce structure, not semantic correctness |
| Remove irrelevant/unsupported material | Removed duplicated sandbox proposal, obsolete tool survey, speculative deltas and unsupported migration archive completion. Useful deferred acceptance boundaries remain in backlog |
| Respect sandbox owner | project.md, backlog.md and config.yaml point to artful-yak without another design |

## OpenSpec compatibility

Inspected upstream source at `9111a7654d7800391459431fff4eaf66e33a3d2e`, including
root/config discovery, parser/validator, spec-driven schema and archive merge.
Executed the published **1.14.1** CLI via `bun x --bun` with telemetry disabled.

| Check | Observed result |
| --- | --- |
| `list --specs` | Discovers all five capabilities through the alias |
| `instructions proposal --change accept-canvas-panel-on-desktop --json` | Resolves repository planningHome and loads config context/rules |
| `validate --all --strict` | All retained specs and active changes pass |
| Disposable `new change workflow-probe` and instructions | Files land in docs/changes and project rules load |
| Automatic `archive workflow-probe --yes --json` through alias | Fails: `The archived delta for 'probe' changed during the final move.` Active change restored, no main spec created |
| Identical fixture with physical openspec directory | Automatic archive merges one ADDED requirement and strict main-spec validation passes |
| Alias with manually merged spec, then `archive workflow-probe --skip-specs --yes --json` | Archives the delta intact, removes the active fixture and leaves the main spec valid |

Probe fixtures are in `/tmp/opencode/docs-workflow-probe` and
`/tmp/opencode/docs-workflow-direct`. They define one `Alias lifecycle` requirement
with one WHEN/THEN scenario, a purpose, proposal and completed task. These are
disposable test artifacts, not repository change history. Do not infer automatic
merge compatibility from successful discovery/validation. Recheck before changing
the pinned version or removing the documented workaround.

## Executed checks and limits

- `bun scripts/check-docs.mjs`: zero failures for links, headings and active-change structure.
- `bun test scripts/check-docs.test.mjs`: six tests passed, including broken links/anchors, missing scenarios, implicit no-delta changes, REMOVED deltas and disconnected planning trees.
- Pinned upstream strict validation: all specs and active changes passed.
- Release/latest tests: 42 passed. Entrypoint regression reports retry and CLI handoff passed.
- Canvas tests: 40 passed, zero failed.
- `git diff --check`: passed.
- Clean staged checkout via `git checkout-index` at `/tmp/opencode/docs-staged-HEMWE2`:
  the symlink, local checks, six regression tests and seven strict-validation items passed without untracked files or the unrelated browser README edit.

No image build, live plugin lifecycle test, native desktop review, GitHub workflow
execution, rollout or push was performed. Canvas desktop acceptance remains in
its own open change. The user accepted this documentation change on 2026-10-11:
“Looks good, documentation accepted.” Implementation is committed in `f679a84`.
This approval does not establish native Canvas acceptance or authorize deployment.

## Subsequent layout simplification

On 2026-10-11 the user approved replacing the alias with one physical `openspec/`
directory and removing `docs/`. The alias findings above describe the former
layout, not the current archive procedure. Links, config, CI paths and checker
fixtures now target `openspec/`. The checker rejects aliases and duplicate trees.

In `/tmp/opencode/openspec-layout-vHfwHT`, a copy of the resulting tree passed
strict validation and `archive layout-probe --yes --json` merged one ADDED
requirement into app-image with `specsUpdated: true`. A byte-prefix comparison
confirmed existing spec content was preserved. The active fixture was removed,
the delta remained in its dated archive, and strict validation passed afterward.
The repository's local checks and eight regression tests also passed.
