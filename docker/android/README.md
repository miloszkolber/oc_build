# Android development image

This image packages the Android SDK, JDK, emulator, noVNC viewer and an on-demand lifecycle controller in a single non-root development container. It is based on the existing Android development environment and preserves its AVD names, profile settings and state paths. The image is not distroless: the Android build tools, emulator and viewer require a substantial runtime closure, including a JDK, shell, libraries and Python.

## Build and license

Review and explicitly accept the [Android SDK terms](https://developer.android.com/studio/terms) before building. SDK terms restrict redistribution subject to exceptions for applicable third-party licenses. This package is for local builds; do not publish SDK-bearing image layers without a separate license review. The build rejects missing acceptance. SDK downloads occur at build time, and Google package revisions are checked by `check-tools.sh`.

```sh
docker build --build-arg ANDROID_SDK_LICENSE_ACCEPTED=1 -t openchamber-android:local docker/android
```

The image targets Linux x86-64 with KVM. The Android command-line tools archive is SHA-256 checked. SDK manager installs the explicitly listed stable packages. The selected JDK base is digest-pinned, but apt and SDK package resolution are not bit-reproducible. No host Android installation is required. A separate SDK build stage keeps the build-only `unzip` utility out of the final image. Android system images and the JDK are retained for the supported profiles and development workflow.

Keep sufficient free space in the AVD state filesystem. The API 35 emulator required at least 7.2 GB free when creating a fresh device during the isolated test, in addition to image storage and other state.

The manually dispatched `Android image check` workflow requires an explicit terms-acceptance input, builds and checks the image, and does not publish it. It does not verify KVM or a real viewer.

## Lifecycle

The optional Compose example uses separate named volumes for build state and emulator home, KVM access, read-only root and a bounded writable `/tmp`. The example exposes viewer port 6080 on loopback only. It creates new state and does not automatically migrate an existing deployment. Add project mounts or use the deployment owner's Compose configuration for an existing workspace. Only run one emulator against an AVD and viewer port at a time.

```sh
export KVM_GID="$(stat -c %g /dev/kvm)"
export ANDROID_SDK_LICENSE_ACCEPTED=1 # Only after reviewing and accepting the terms.
docker compose -f docker/android/compose.yaml up -d --build
docker compose -f docker/android/compose.yaml exec android python3 /usr/local/bin/android-runtime.py start
docker compose -f docker/android/compose.yaml exec android check-emulator.sh
```

The `start` request is asynchronous, so retry the readiness check while Android boots. Use an existing trusted private route if the viewer must be reached remotely. The viewer provides device control without application authentication. Do not expose ADB, VNC or the emulator console publicly.

The default command starts the controller, not the emulator. Run these commands inside the persistent container:

```sh
python3 /usr/local/bin/android-runtime.py start
python3 /usr/local/bin/android-runtime.py status
check-emulator.sh
python3 /usr/local/bin/android-runtime.py stop
```

`start` requests an asynchronous start. `status` is process status, not guest readiness. `check-emulator.sh` checks boot, profile geometry and the viewer. `FYLAX_AVD_PROFILE` supports `api29-small`, `api35-standard` (default) and `api35-tall`. Existing AVD names remain unchanged. `ANDROID_EMULATOR_IDLE_SECONDS` defaults to 3600. Connected viewer sessions prevent idle shutdown; ADB-only work does not. ADB jobs may therefore be interrupted when no viewer is connected.

On stop, the launcher attempts guest filesystem sync and emulator-console exit before cleaning up viewer processes. Preserve writable AVD and build state when changing images. Do not start two emulator containers against the same AVD or viewer port. Publication or image construction does not authorize a host deployment.

## Verification

Run `check-tools.sh` and `check-sdk-build.sh` in an isolated container with writable temporary state. `check-sdk-build.sh` creates a diagnostic APK, not a product application. `check-viewer.py` checks the WebSocket-to-VNC handshake, framebuffer and pointer path while the viewer is running. Full acceptance requires KVM boot, ADB, viewer input, idle stop, graceful restart and persistence checks with disposable AVD state. A VNC protocol check is not browser or native desktop acceptance.
