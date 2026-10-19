# Dependency maintenance refresh, 2026-10-19

## Why

The scheduled maintenance pass reviewed every pinned component this repository builds or ships, including the categories Dependabot does not cover: Docker base images, upstream release assets and vendored code. Four findings need a fix now.

- `docker/sandbox/` installs `pnpm@11.28.5`. Upstream 11.28.6 fixes a security issue — `pnpm publish` sent a CI identity token to a registry the token was not issued for — and repairs a regression 11.28.5 introduced, where `httpProxy` or `httpsProxy` written with no value failed every command with `ERR_PNPM_INVALID_SETTING`. The sandbox advertises pnpm as a toolchain, so a build can run an untrusted lockfile through it.
- `docker/sandbox/` installs `@fission-ai/openspec@1.14.1`, which depends on `fast-glob` and therefore on `braces`, the package named by GHSA-vfj7-8cjw-p6xm. Version 1.14.3 replaces that dependency with `tinyglobby` plus `brace-expansion@^5`, and also fixes `openspec validate --all` hanging on a zero-width TTY, which is how a pre-commit runner or `script -qec` can hand it a terminal.
- `docker/sandbox/` copies uv from `ghcr.io/astral-sh/uv:0.13.0`. Upstream 0.13.1 is a patch release with bug fixes only, including two that matter to a shared sandbox: tool and managed-Python uninstalls no longer delete unrelated files next to their storage directories, and concurrent project commands reaching one environment through real and symlinked paths are serialized.
- `docker/sandbox/README.md` documents a local check against `docker/sandbox/sandbox.test.mjs`. That file was deleted when the sandbox moved to Compose (`9a905a7`), so the documented command fails for anyone who follows it.

One further finding is real but not routine, and is held for operator input rather than fixed here: the sandbox Go toolchain line. See [backlog](../../backlog.md) and the run report.

## Scope

- Bump `pnpm` to 11.28.6 and `@fission-ai/openspec` to 1.14.3 in `docker/sandbox/Dockerfile`, assert both in `docker/sandbox/check-image.sh` and record them in the sandbox README.
- Bump the uv source image to `ghcr.io/astral-sh/uv:0.13.1` and add the missing version assertion for it, so the README's claim is checked rather than printed.
- Update the pinned OpenSpec version in the four documented `bun x` commands and in the documentation workflow.
- Remove the stale `sandbox.test.mjs` command from the sandbox README.
- Create `openspec/maintenance-state.md`, the repository-owned maintenance high-water mark the scheduled pass keeps.
- Archive the completed 2026-10-13 dependency refresh into the consolidated change history.

Affected capabilities: agent sandbox, release pipeline (documentation workflow pin). No requirement changes: these are implementation pins and records, so `skip_specs` applies.

## Out of scope

- Go toolchain line, held for operator input and prepared on its own branch.
- Upstream OpenChamber 2.4.0 adoption: the release pipeline already discovered, built, checked and promoted it. Both strict patches still apply to the 2.4.0 bundle, and its top-level layout is unchanged from 2.3.1, so the image recipe needed no edit.
- Rembric vendored core: the files are byte-identical at plugin v0.34.1, so there is nothing to re-vendor.
- `extensions/canvas` and `docker/browser` Bun packages, and GitHub Actions: Dependabot-owned. The open Canvas pull requests were reviewed for semantic breakage only.
- Browser-image Chromium and base-image digests: mutable by design and refreshed by the weekly rebuild, which runs again today.

## Status

Routine fixes implemented, verified, merged and pushed. The Go toolchain line is held for operator input on `maintenance/go-toolchain-line-2026-10-19` and is not merged.
