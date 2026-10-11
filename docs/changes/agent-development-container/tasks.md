# Tasks

## 1. Base image and toolchain

- [ ] 1.1 Create `docker/devcontainer/` with the Dockerfile, `.dockerignore` and README skeleton.
- [ ] 1.2 Pin the base image through `mirror.gcr.io`, matching the family the published images use.
- [ ] 1.3 Install the toolchains the builds consume and record each pinned version in the README.
- [ ] 1.4 Copy the toolchain binaries with their shared-library closure into the runtime stage.
- [ ] 1.5 Bake the toolchain versions into an image label so a check can read them without running the tools.

## 2. Entry points

- [ ] 2.1 Write `entrypoint.sh` dispatching the documented build, test and package commands.
- [ ] 2.2 Cover extension install with the frozen lockfile, the test run, the package step and the example validation loop.
- [ ] 2.3 Cover a local image build for each of the two published image contexts.
- [ ] 2.4 Document every entry point in the README with the exact command a caller types.

## 3. Mount points

- [ ] 3.1 Define the workspace mount and the Bun global cache and Docker build cache volumes.
- [ ] 3.2 Verify a workspace write survives across two runs.
- [ ] 3.3 Verify the cache volume makes a second install a cache hit.
- [ ] 3.4 Verify a clean checkout installs with no pre-existing cache.

## 4. Image check

- [ ] 4.1 Write `check-image.mjs` verifying each toolchain resolves at the pinned version.
- [ ] 4.2 Have the check run every documented entry point inside the built image.
- [ ] 4.3 Have the check confirm the mount points are writable and that no socket is mounted by default.
- [ ] 4.4 Wire the check into the build so the image cannot be tagged without passing it.

## 5. CI parity

- [ ] 5.1 Add the parity job that runs the documented entry points in the container.
- [ ] 5.2 Make the parity job fail when the image's pinned toolchain versions differ from the workflows'.
- [ ] 5.3 Run the parity job on pull requests touching any build, test or package path.

## 6. Documentation and verification

- [ ] 6.1 Add the `dev-container` spec delta to `docs/specs/` by syncing this change, or leave it open for review.
- [ ] 6.2 Add the development container to the layout table in [`docs/project.md`](../../project.md).
- [ ] 6.3 Record the toolchain versions, the image digest and the source revision of the first successful build.
- [ ] 6.4 Verify the published app and browser image contents are unchanged by diffing their build outputs before and after.
