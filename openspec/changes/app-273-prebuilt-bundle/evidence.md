# Evidence

Scheduled Build runs 44665863773 and 44728488335 failed in the 2.7.3 image job: the release tarball no longer contains `server/lib/opencode/openchamber-routes.js`, so `self-update.patch` found no target and `patch --forward --fuzz=0` failed the build. The 2.7.3 asset was downloaded and its SHA-256 matched the release digest `2a62802ebf8691e5c4a430c4128f5099071a60c46c71c7a059619d50c554208c`.

The new bundle ships prebuilt output: `build/server/lib/**` (compiled, readable, with source maps), `build/bin/` and `dist/`. The patched behaviors persist: the self-update endpoints live in `build/server/lib/self-update/openchamber-routes.js` and the home-root guard in `build/server/lib/git/service.js`. Both patches were regenerated against the extracted 2.7.3 tree, verified with `patch --dry-run --batch --forward --fuzz=0`, and their outputs byte-identical to hand-edited references. An initial hand edit accidentally dropped the `app.get(...)` anchor line; the generated diff exposed it and the edit was corrected before anything was committed.

The entrypoint regression passed with the CLI path moved to `build/bin/cli.js`, and the 43 release/latest contract tests pass. A local 2.7.3 image built cleanly and passed the real image check under network-disabled, read-only, capability-dropped conditions, including the home-repository opt-in assertions against the compiled git service and the recursive syntax check over `build/`.

An isolated fixture asserting the update endpoints' disabled behavior was not part of the image check before this change and remains a residual gap. Publication, rollout and digests are recorded after CI.
