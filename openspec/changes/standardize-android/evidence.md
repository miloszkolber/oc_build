# Evidence

## Source and scope

The existing product-owned Android Dockerfile, SDK and viewer checks, launcher and deployment-owned lifecycle controller were inspected. The operator selected one persistent container with on-demand start and idle stop. The new package preserves existing AVD names, paths and profile values. The SDK terms' [section 3.4](https://developer.android.com/studio/terms) restricts redistribution, subject to third-party license exceptions. The image is locally built and the manual CI workflow does not push it.

## Build and tools

The multi-stage local image built with the explicitly accepted SDK terms and passed the Dockerfile's tool check. Docker image inspection reports approximately 2.54 GB. Inside the image the SDK occupies 6.3 GB, including 3.2 GB for the API 29 system image and 1.7 GB for API 35. Build-only `unzip` is absent from the final image, reducing the inspected image size by about 177 KB from the compatible single-stage baseline. The JDK, both system images and viewer stack remain to support existing use. Building without `ANDROID_SDK_LICENSE_ACCEPTED=1` failed at the license gate. A non-root, read-only, network-disabled container passed `check-tools.sh` and compiled and signed the diagnostic APK with `check-sdk-build.sh`.

An isolated controller test with empty writable state verified stopped startup and creation of `/state/home` and `/state/android`. Requesting start without KVM returned to stopped and logged the missing KVM device. The example Compose configuration validated and started with newly created, writable named volumes. Its temporary project, containers and volumes were removed.

## Emulator

Isolated KVM-backed guests for all three profiles booted on the final multi-stage image and passed `check-emulator.sh`, including expected API, physical size/density and viewer HTTP checks. The packaged `check-viewer.py` connected through the viewer WebSocket, performed a VNC handshake, received framebuffer data and sent a pointer event. `xdotool` observed the expected pointer position for each profile. A second start request was idempotent. A marker written inside an isolated guest survived controller stop and restart. A held VNC connection prevented idle shutdown beyond a 30-second timeout. Once the connection closed, the emulator stopped while the development container remained running.

An initial probe with a 6 GB temporary AVD filesystem failed because the emulator required 7.2 GB free. Increasing the temporary filesystem to 12 GB addressed that setup failure. Another fresh-state probe exposed a missing `/state/home` for ADB. The controller now creates both image-default home directories before accepting requests, and the isolated boot and restart probe passed after that correction.

## Viewer and outstanding checks

The noVNC page returned HTTP successfully, but the sandbox browser (Obscura) displayed `selectbox.options.add is not a function` while initializing noVNC. This is browser-specific evidence, not proof that the native desktop viewer works or fails. noVNC HTML and UI script hashes and the noVNC, websockify, x11vnc, Xvfb and Openbox package versions match the previously operator-accepted environment. The protocol checks verify framebuffer delivery and input, not the native desktop or a real browser UI. Native desktop acceptance remains unverified.

The image is not distroless and the small measured reduction is not proof of a mathematically minimal closure. The JDK, Android SDK, both system images, emulator and viewer remain compatibility inputs. The manual GitHub workflow has not yet been run.

## Live migration

After confirming the previous emulator was stopped and its development container had no active build, the deployment owner backed up the existing build and emulator state, Compose configuration and controller, and retained the previous image. The new image replaced only the Android container, with the same KVM, mounts, private viewer port and profile. The deployed container started stopped and passed `check-tools.sh` and the existing project's offline Gradle version check. The existing API 35 AVD booted and passed guest readiness, VNC framebuffer and pointer checks, and graceful stop. The previous controller file is no longer mounted. Backup, rollback and host-specific details are maintained in the local deployment runbook. Browser/native desktop acceptance is still distinct from these protocol checks.

## Documentation

The repository documentation checker, nine checker tests and pinned OpenSpec `validate --all --strict` passed in the workspace sandbox.
