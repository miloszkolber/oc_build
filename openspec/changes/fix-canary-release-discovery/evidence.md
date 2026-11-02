# Evidence

The upstream rolling release has tag `canary`, `prerelease: true`, release ID `430990977`, and no versioned web tarball. [Scheduled run 41499464540](https://github.com/miloszkolber/oc_build/actions/runs/41499464540) failed discovery with `Expected v-prefixed release tag`. Its image and latest jobs were skipped.

The regression fixture verifies the rolling canary no longer blocks a stable version or a versioned prerelease. It verifies a stable `canary` and an unrelated malformed `nightly` still fail. The full release/latest/entrypoint suite passed 43 tests.

The 2.6.0 asset hash matched the GitHub release digest. Both local patches applied with zero fuzz. A local image built using the published asset SHA-256 and passed the restricted, offline real-image check. This does not establish a live OpenCode integration or native desktop acceptance. Documentation checks, checker tests and strict OpenSpec validation passed. Hosted publication remains pending.
