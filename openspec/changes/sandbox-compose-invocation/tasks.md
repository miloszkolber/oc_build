# Tasks

- [x] 1.1 Delete the launcher wrapper and its regression test.
- [x] 1.2 Rewrite the sandbox package README around Compose execution and the optional alias.
- [x] 1.3 Drop the launcher step from the sandbox image workflow.
- [x] 1.4 Update the workspace sandbox reference and its in-repo snapshot: host-installed Docker, Compose invocation.
- [x] 1.5 Run the image check, documentation checks and strict OpenSpec validation; record evidence.
- [x] 1.6 Publish through CI and pull the image.

## 2. Deployment

- [x] 2.1 Give the Compose service the identity, temporary filesystem, mounts and environment the wrapper used to provide.
- [x] 2.2 Remove the installed launcher and document the optional alias in the local deployment docs.
- [x] 2.3 Verify a build/test command and a loopback-published dev server through Compose.
- [x] 2.4 Archive this change after review, merging the requirement deltas into the main spec.
