# Review spec-driven documentation

## Why

The first reorganization mixed implemented contracts with proposed designs,
duplicated the sandbox owner's work and overstated verification. The user asked
for an independent review and a minimal, detailed spec-driven foundation.

## Scope and status

**Implemented and accepted on 2026-10-11.** Correct and consolidate documentation
against source. Remove unsupported archive claims and duplicate plans. Expose
the one docs tree to OpenSpec and add local/CI validation. Preserve package
command ownership and native-client acceptance boundaries.

This is documentation and development-tooling work with `skip_specs: true`.
It changes no app, browser, Canvas or plugin runtime. The updated release-pipeline
spec describes the added documentation check. It does not assert a GitHub run.
Sandbox development remains on artful-yak. No rollout or desktop acceptance is
authorized or claimed by this review.

## Impact

The root index and agent guidance point to the spec workflow. OpenSpec 1.14.1
uses the `openspec -> docs` alias for discovery. Archive requires a reviewed
manual spec merge before `--skip-specs`, as verified in [evidence](evidence.md).
Git history retains removed material. Do not restore speculative requirements
to recover useful historical context.
