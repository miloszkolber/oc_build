# Tasks

## 1. App image patch against OpenChamber 2.5.2

- [x] 1.1 Reproduce the failure: apply both patches with `--fuzz=0` to the extracted `openchamber-web-2.5.2.tgz`. Verified by the patch exit status and the failing hunk in `server/lib/git/service.js`.
- [x] 1.2 Rewrite `home-repository.patch` against the 2.5.2 `probeRepository` implementation, keeping one named home-root opt-in, filesystem-root rejection and unchanged VCS-initialization guards. Verified by `--fuzz=0` application to the 2.5.2 bundle and by the image check's opt-in/guard assertions.
- [x] 1.3 Build the app image at 2.5.2 and run `check-image.mjs` under the published restricted runtime flags. Verified by the check's exit status and output.

## 2. Toolchain pins

- [x] 2.1 Bun 1.4.3 to 1.4.4 in the three image stages and the three workflows that install Bun, with the README bases updated. Verified by grepping for the old pin and by rebuilding the images.
- [x] 2.2 uv 0.13.1 to 0.13.5 in the sandbox image, its image check and its README. Verified by `check-image.sh`.
- [x] 2.3 pnpm 11.28.6 to 11.28.8 in the sandbox image, its image check, its README and the backlog note. Verified by `check-image.sh`.
- [x] 2.4 OpenSpec 1.14.3 to 1.15.0 in the sandbox image, its image check, its README, the documented `bun x` pins and the documentation workflow. Verified by `check-image.sh` and a strict `validate --all`.

## 3. Verification and records

- [x] 3.1 Run the documentation checker, its regression tests and the pinned strict OpenSpec validation in the rebuilt sandbox image.
- [x] 3.2 Run the release, latest and entrypoint tests and the Rembric bundle export check.
- [x] 3.3 Rebuild the browser image and run its real Chromium check.
- [ ] 3.4 Update `openspec/maintenance-state.md`, record the held Node runtime finding in the backlog, archive this change and consolidate the history entry.
- [ ] 3.5 Merge to `main`, push and watch the triggered workflows to green, recording published tags and digests.
