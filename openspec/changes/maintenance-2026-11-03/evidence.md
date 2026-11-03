# Evidence

## App archive compatibility

The deployed 2.6.0 image uses BusyBox tar. With a `.tar.bz2` fixture written into its `/tmp`, `tar xf` failed with `tar: short read` while `tar xjf` succeeded after the target directory existed. Upstream `server/lib/dictation/local/model-downloader.js` extracts `.tar.bz2` with `tar xf` on non-Windows platforms, so 2.6.0's local dictation model installation could not extract its archive in this image.

The rebuilt image keeps GNU tar 1.34 and adds `bzip2`/`bunzip2` BusyBox applets. A round trip in the image printed `tar (GNU tar) 1.34`, extracted a bzip2 archive with `tar xf`, and returned `hello` plus `bz2-roundtrip-ok`. `check-image.mjs` now asserts GNU tar and extracts a bundled 107-byte `.tar.bz2` fixture under the publication flags; it passed. The full restricted image check passed at 2.6.0.

## Toolchain refresh

The sandbox image built and its image check passed, reporting pnpm 11.28.10 and OpenSpec 1.16.0. Documentation checks ran inside the rebuilt image with zero failures, nine checker tests and strict OpenSpec validation across five specs and the active change. OpenSpec 1.16.0 also passed `validate --all --strict` against the repository before the bump.

## Remaining review findings

- `7zip-bin` 5.2.0 ships a non-executable `7za` because install scripts are skipped, but upstream imports and executes it only when `process.platform === 'win32'`. Linux extraction uses tar, so no action is needed for this image.
- `node-pty` moved from 1.2.0-beta.15 to beta.18 and `simple-git` from 3.x to 4.x in 2.6.0. The running image passes a real PTY spawn and the home-root Git opt-in probe; broader Git workflows remain desktop-acceptance scope.
- `@opencode/client` 2.2.5 matches the external OpenCode 2.2.5; the app reports ready.

## Acceptance recorded

- The operator accepted native desktop UI acceptance for the deployed 2.6.0 app on 2026-11-03.
- Rembric live evidence: the plugin loads for OpenCode 2.2.5, the server reports 67 sessions, and dispose-flush lines were logged. Direct recall-injection observation is not available without instrumenting a model request; it is recorded as an access limit, not a pass.

## Publication and rollout

Build workflow 41553883806 and Sandbox image workflow 41553884006 passed, as did documentation workflow 41553883778. App `2.6.0-r430970257` and `latest` resolve to `sha256:0ac400110fa2afaebd91e377459b1182f416d2abdf231b7b748e14f6b77ef9e1`. The sandbox `latest` resolves to `sha256:5e14e5326930d7dbb9dc5e35d39756bba01a8ad289d5d5fb3eb00c846423ed88` and reports pnpm 11.28.10 and OpenSpec 1.16.0; its check passes.

The app container was recreated on the new digest and is healthy. Its `/health` reports 2.6.0 with the external OpenCode service ready. A live round trip printed `tar (GNU tar) 1.34` and extracted a bzip2 archive, confirming the runtime fix in the deployed image.
