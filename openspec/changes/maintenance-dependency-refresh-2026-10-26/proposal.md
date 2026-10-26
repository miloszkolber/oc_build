# Dependency maintenance refresh (2026-10-26)

## Why

The scheduled maintenance pass over inputs Dependabot does not manage found one integration break and several security or patch updates:

- The `home-repository.patch` no longer applies to upstream OpenChamber 2.5.2. Upstream replaced `isGitRepository` with a single `probeRepository` call that runs `rev-parse --git-dir --show-toplevel` together, so the patch's context hunk (which targeted the old split implementation) fails with `--fuzz=0`. The app pipeline cannot publish 2.5.2 until the patch matches the new source.
- Bun 1.4.4 fixes security issues in TLS, WebSocket, the database clients and the package manager. Bun is the build runtime of the app and browser images, a copied runtime in the app tools stage, and the sandbox toolchain.
- uv 0.13.4 and 0.13.5 address GHSA-hq85-5cpj-mr62 (a compromised eMudhra/emSign root CA) and ship the rebuilt managed Python sets. The sandbox copies uv.
- pnpm 11.28.8 embeds a Node.js that no longer trusts the October 2026 distrusted CA intermediates. The sandbox installs pnpm.
- OpenSpec 1.15.0 is the current release of the documentation validator used by the sandbox image, the documented `bun x` pins and the documentation workflow.

## Scope

- Adapt `home-repository.patch` to the 2.5.2 implementation while preserving the contract: one explicitly named existing home-root checkout is allowed, filesystem roots stay rejected, and VCS initialization guards stay unchanged.
- Refresh the Bun, uv, pnpm and OpenSpec pins and their assertions and documentation.
- Record the newly observed upstream runtime floor: OpenChamber declares `engines.node >= 24.14.0` (Node 24 LTS, `lts/krypton`) while the images run distroless Node 22. This is a runtime-line decision and is held for operator input, not applied here.

## Affected capabilities

- [App image](../../specs/app-image/spec.md): patch source only; the requirement text is unchanged and already covers zero-fuzz failure.
- [Browser MCP](../../specs/browser-mcp/spec.md): build runtime pin only.
- [Agent sandbox](../../specs/agent-sandbox/spec.md): toolchain pins and image-check assertions.

No requirement changes, so this change uses `skip_specs: true`.

## Status

Implemented and verified in this pass. Not authorized to change the Node runtime line or host deployment.
