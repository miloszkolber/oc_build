# Documentation workflow

This branch follows the spec-driven approach accepted in `bright-heron`
(`f679a84`, `399016e`) without importing unrelated Canvas or browser changes.

- Implemented contracts live in `specs/<capability>/spec.md`.
- Nontrivial changes have one folder in `changes/` containing a proposal,
  numbered tasks, requirement deltas and execution evidence.
- Main specs describe implemented behavior, not proposed features or proof
  that every scenario has run. Package READMEs own commands.
- Review and verify before manually merging deltas into main specs.
- Archive only after completion. Do not fabricate prior archive history.
- With `openspec -> docs`, OpenSpec 1.14.1 requires manual delta merging and
  `archive <name> --skip-specs`. Automatic spec-update archive fails its final
  fingerprint check. Do not bypass validation to hide that failure.

## Checks

Run these inside the agent container from the repository root:

```sh
sandbox run -- node --test docker/sandbox/sandbox.test.mjs
sandbox run -- node scripts/check-docs.mjs
sandbox run -- sh -c 'OPENSPEC_TELEMETRY=0 openspec validate --all --strict'
```

Main specs use Purpose, Requirements, Requirement and Scenario headings.
Requirements state observable SHALL/MUST behavior. Scenarios use WHEN/THEN.
MODIFIED deltas replace the entire requirement, retaining unaffected scenarios.
Small corrections can use a reviewed diff. Acceptance-only changes declare
`skip_specs: true` in `.openspec.yaml`.

## Capabilities

- [Agent sandbox](specs/agent-sandbox/spec.md): container execution and storage.
- Other capabilities remain documented in their package READMEs and existing
  roadmap until the `bright-heron` foundation is integrated. Do not duplicate
  its specifications here against older implementation versions.
