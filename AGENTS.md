# Repository workflow

- Read docs/README.md and the affected capability spec before changing behavior.
- Nontrivial changes use one docs/changes folder with proposal, deltas,
  numbered tasks and execution evidence. Keep tasks current.
- Main specs describe implemented contracts. Merge deltas manually after
  verification, then archive with --skip-specs as documented in docs/README.md.
- Use `sandbox run -- <command>` for builds, tests and development tools.
  Record new tools in docker/sandbox/Dockerfile and its checks, not on the host.
- Package READMEs own commands. Host deployment is a separate owner.
- Publication is not deployment. Workspace mounts and rootless Docker grant
  host-user access, not containment from the host user.
