# Tasks

## 1. Sandbox toolchain refresh

- [ ] 1.1 Bump `pnpm` to 11.28.6 in `docker/sandbox/Dockerfile`, assert it in `docker/sandbox/check-image.sh` and record it in `docker/sandbox/README.md`. Verified by: `pnpm --version` equals 11.28.6 in a rebuilt image and the image check passes.
- [ ] 1.2 Bump `@fission-ai/openspec` to 1.14.3 in `docker/sandbox/Dockerfile`, assert it in `check-image.sh`, record it in the sandbox README, and update the four `bun x` pins in `openspec/README.md` and the documentation workflow. Verified by: `openspec --version` equals 1.14.3 in a rebuilt image, and `openspec validate --all --strict` passes with it.
- [ ] 1.3 Bump the uv source image to `ghcr.io/astral-sh/uv:0.13.1` in `docker/sandbox/Dockerfile`, record it in the sandbox README and assert the version in `check-image.sh`. Verified by: `uv --version` equals 0.13.1 in a rebuilt image.
- [ ] 1.4 Remove the stale `sandbox.test.mjs` command from `docker/sandbox/README.md`. Verified by: every command in the README's build section names a file that exists.

## 2. Records

- [ ] 2.1 Create `openspec/maintenance-state.md` with the reviewed revisions, recipe paths, advisories and dispositions, and update it in later runs. Verified by: the local documentation check and strict validation pass.
- [ ] 2.2 Archive the completed 2026-10-13 dependency refresh into `openspec/changes/history.md`. Verified by: `openspec validate --all --strict` passes with the change folder gone.
- [ ] 2.3 Record the held Go toolchain line in `openspec/backlog.md`. Verified by: the local documentation check passes and the row names the branch that carries the evidence.

## 3. Checks

- [ ] 3.1 Run `bun scripts/check-docs.mjs`, `bun test scripts/check-docs.test.mjs` and `openspec validate --all --strict` in the rebuilt sandbox image. Verified by: zero failures.
- [ ] 3.2 Build the sandbox image from the edited Dockerfile. Verified by: the build's own `check-image.sh` run prints `sandbox image check OK` with the new versions.
- [ ] 3.3 Run the sandbox image check against the previously published image. Verified by: it fails on the superseded pnpm and OpenSpec pins.
- [ ] 3.4 Re-run the release, latest and entrypoint test files and the Rembric bundle export check. Verified by: unchanged results.

## 4. Publication

- [ ] 4.1 Merge to `main`, push and monitor the triggered documentation and sandbox workflows. Verified by: both workflows complete successfully and the sandbox image is republished.
