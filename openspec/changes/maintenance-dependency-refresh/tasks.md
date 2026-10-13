# Tasks

## 1. Sandbox toolchain security refresh

- [x] 1.1 Bump `pnpm` to 11.28.5 in `docker/sandbox/Dockerfile` and record it in `docker/sandbox/README.md`. Verified by: `pnpm --version` equals 11.28.5 in a rebuilt image.
- [x] 1.2 Assert the pinned pnpm version in `docker/sandbox/check-image.sh`. Verified by: the image check fails when the version differs.
- [x] 1.3 Bump the Bun base to `oven/bun:1.4.3` in the app, browser and sandbox Dockerfiles and record it in the affected READMEs. Verified by: rebuilt images report `bun --version` 1.4.3.

## 2. Rembric vendored protocol sync

- [x] 2.1 Replace `extensions/rembric/core/rembric-plugin-core.mjs` with the byte-for-byte Rembric plugin v0.34.0 file and update the plugin README record. Verified by: file SHA-256 matches upstream v0.34.0 and the bundle still exports `rembric.lifecycle`.
- [x] 2.2 Leave the README's runtime claim honest: the adapter was load-verified against an older Rembric, and live re-verification against the current server is pending.

## 3. Checks

- [x] 3.1 Run `bun scripts/check-docs.mjs` and `scripts/check-docs.test.mjs`. Verified by: zero failures.
- [x] 3.2 Run `openspec validate --all --strict`. Verified by: all specs pass.
- [x] 3.3 Build the sandbox image and run its image check. Verified by: `sandbox image check OK`.
- [x] 3.4 Build the Rembric bundle and import check. Verified by: `p.id === "rembric.lifecycle"`.

## 4. Durable records

- [x] 4.1 Record the maintenance high-water mark in memory for the next scheduled run.
- [x] 4.2 Update `openspec/backlog.md` to reflect the active maintenance mechanism for Docker base images.
