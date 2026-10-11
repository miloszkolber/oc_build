# Repository workflow

- Read [openspec/README.md](openspec/README.md) and the affected capability spec before
  changing behavior. Confirm the contract against source and checks.
- Use one scoped folder in `openspec/changes/` for nontrivial behavior changes:
  proposal, requirement deltas, verifiable tasks and execution evidence. Add
  design only for consequential decisions. Keep tasks current as work lands.
- Main specs describe implemented contracts. Put unapproved ideas in
  `openspec/backlog.md`, not requirements or speculative implementation plans.
- MODIFIED deltas replace whole requirements. Preserve unaffected scenarios.
  Sync and archive after verification/review, not merely because files exist.
  Follow the archive workflow in openspec/README.md.
- Small corrections may use a reviewed diff. Acceptance/docs-only changes use
  `skip_specs: true`. Never fabricate completed task or archive history.
- Run `bun scripts/check-docs.mjs` and the pinned upstream validation documented
  in `openspec/README.md`. Update specs and evidence with the code, not afterward.
- Use `sandbox run -- <command>` for builds, tests and development tooling.
  Record new tools in docker/sandbox/Dockerfile and its checks, not on the host.
- Package READMEs own commands. Host deployment and OpenCode are separate owners.
  Publishing an image does not authorize rollout or a service restart.
- Browser MCP evidence is not native desktop acceptance. Guest permissions and
  sandbox mounts are trust grants, not OS isolation. Keep secrets out of artifacts.
