# Evidence

Scheduled Build runs 44665863773 and 44728488335 failed in the 2.7.3 image job: the release tarball no longer contains `server/lib/opencode/openchamber-routes.js`, so `self-update.patch` found no target and `patch --forward --fuzz=0` failed the build. The 2.7.3 asset was downloaded and its SHA-256 matched the release digest `2a62802ebf8691e5c4a430c4128f5099071a60c46c71c7a059619d50c554208c`.

The new bundle ships prebuilt output: `build/server/lib/**` (compiled, readable, with source maps), `build/bin/` and `dist/`. The patched behaviors persist: the self-update endpoints live in `build/server/lib/self-update/openchamber-routes.js` and the home-root guard in `build/server/lib/git/service.js`. Both patches were regenerated against the extracted 2.7.3 tree, verified with `patch --dry-run --batch --forward --fuzz=0`, and their outputs byte-identical to hand-edited references. An initial hand edit accidentally dropped the `app.get(...)` anchor line; the generated diff exposed it and the edit was corrected before anything was committed.

The entrypoint regression passed with the CLI path moved to `build/bin/cli.js`, and the 43 release/latest contract tests pass. A local 2.7.3 image built cleanly and passed the real image check under network-disabled, read-only, capability-dropped conditions, including the home-repository opt-in assertions against the compiled git service and the recursive syntax check over `build/`.

An isolated fixture asserting the update endpoints' disabled behavior was not part of the image check before this change and remains a residual gap. Publication, rollout and digests are recorded after CI.

## Publication and rollout

Build workflow 44740027533 passed on 416cb49: discovery, the 2.7.3 image build with pre-publication checks, canonical publication and latest promotion. `2.7.3-r451966296` and `latest` resolve to `sha256:56ab5acf839bab00f065dfcc2512f8423e8f7d6451d6b9a81e092620846eb174`. Documentation workflow 44740027557 passed.

The deployment pulled the image and recreated the app container: health reports 2.7.3 with OpenCode ready and running, the UI and config endpoints return 200, and the logs show no errors. The disabled update-check endpoint returned `{"available":false}` live. With the deployment's configured home-repository opt-in, `isGitRepository('/home/core')` returned true inside the container; without the variable it returned false with the expected rejection warning. The earlier endpoint fixture gap is closed by these live checks.
