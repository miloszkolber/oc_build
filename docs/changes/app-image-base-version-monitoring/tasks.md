# Tasks

## 1. Scope the check

- [ ] 1.1 List the base versions the app image pins: the Node bundle stage base, the Bun runtime stage source, the Debian tools stage base and the distroless runtime base.
- [ ] 1.2 Decide where the recorded digests live: a committed file in `docker/openchamber/` or a repository variable. Record the choice and the reason.
- [ ] 1.3 Confirm the browser image is excluded and note the existing weekly rebuild as its coverage.

## 2. Write the check

- [ ] 2.1 Write the check script so it reads the pinned versions from the Dockerfile rather than from a hardcoded list.
- [ ] 2.2 Resolve each current digest through `mirror.gcr.io` and compare with the recorded value.
- [ ] 2.3 Fail explicitly with the version, the recorded digest and the current digest when they differ.
- [ ] 2.4 Fail explicitly when the cache is unavailable rather than falling back to Docker Hub.
- [ ] 2.5 Confirm the check performs no writes to any build input.

## 3. Wire the workflow

- [ ] 3.1 Add the workflow with a weekly schedule and a manual dispatch input.
- [ ] 3.2 Declare only `contents: read` permissions, consistent with the other workflows.
- [ ] 3.3 Pin the checkout action to a commit SHA with `persist-credentials: false`.

## 4. Verify

- [ ] 4.1 Change a pinned version in the Dockerfile locally and confirm the check reports the new value.
- [ ] 4.2 Point the check at a deliberately stale recorded digest and confirm it fails with the expected message.
- [ ] 4.3 Run the check with the cache unreachable and confirm the failure is explicit.
- [ ] 4.4 Confirm no pull request is opened and no file is modified by a run.

## 5. Document

- [ ] 5.1 Update [`docs/README.md`](../../README.md) so the standing obligation points at the mechanism rather than standing alone.
- [ ] 5.2 Note in `docker/openchamber/README.md` that base-version monitoring is a separate workflow, not part of the build.
- [ ] 5.3 Record the first recorded digests and the source revision they were taken from.
