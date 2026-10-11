# Tasks

- [x] 1.1 Remove the Docker CLI, compose and buildx from the sandbox image, its check and its build inventory.
- [x] 1.2 Drop DOCKER_HOST and the rootless socket mount from the launcher; keep explicit host-runtime selection.
- [x] 1.3 Update the launcher regression test to assert no Docker endpoint reaches the container.
- [x] 1.4 Update the sandbox README, the workspace sandbox reference and its in-repo snapshot.
- [x] 1.5 Rebuild the image, run the image check and launcher tests, and record evidence.
- [x] 1.6 Run the repository documentation and strict OpenSpec checks.
- [x] 1.7 Publish through the normal CI path and pull the new image.

## 2. Host retirement

- [ ] 2.1 Stop and remove the rootless Docker user unit and its socket.
- [ ] 2.2 Remove the rootless data root and confirm `sandbox run` still works with toolchain commands.
- [ ] 2.3 Confirm no host service depends on the retired daemon and update the local deployment docs.
- [ ] 2.4 Archive this change after review, merging the requirement deltas into the main spec.
