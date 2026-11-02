# Evidence

The upstream rolling release has tag `canary`, `prerelease: true`, release ID `430990977`, and no versioned web tarball. [Scheduled run 41499464540](https://github.com/miloszkolber/oc_build/actions/runs/41499464540) failed discovery with `Expected v-prefixed release tag`. Its image and latest jobs were skipped.

The regression fixture verifies the rolling canary no longer blocks a stable version or a versioned prerelease. It verifies a stable `canary` and an unrelated malformed `nightly` still fail. The full release/latest/entrypoint suite passed 43 tests.

The 2.6.0 asset hash matched the GitHub release digest. Both local patches applied with zero fuzz. A local image built using the published asset SHA-256 and passed the restricted, offline real-image check. This does not establish a live OpenCode integration or native desktop acceptance. Documentation checks, checker tests and strict OpenSpec validation passed. Hosted publication remains pending.

After merge, Build workflow 41524127463 passed discovery, plugin, real image checks, publication, provenance verification and exact-byte latest promotion. Tag `2.6.0-r430970257` and `latest` resolve to `sha256:d49880051901311e760fa680ac9c57198e2c69f1cf713b7f42d488b3a7d19a7d`. Documentation workflow 41524127485 passed. The local deployment was updated separately under the operator's direction; the app became healthy at 2.6.0, reported the external OpenCode service ready, and returned HTTP 200 at its root. This does not establish native desktop acceptance.
