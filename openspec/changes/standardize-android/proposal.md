# Standardize the Android development image

## Why

The existing Android development image is owned by a product repository and the lifecycle controller is mounted from deployment configuration. Make the image a self-contained member of this suite while preserving the existing single-container, on-demand workflow and persistent AVD data.

## Scope

Introduce an Android image source, lifecycle control and checks in `docker/android`. Keep its current SDK, emulator profiles, viewer layout, idle timeout and graceful stop. Document a locally built image and the SDK license gate. Do not publish SDK-bearing image layers without an independent redistribution review. Image delivery alone does not authorize deployment or a host service restart.

The operator selected preservation of the existing on-demand and idle-stop lifecycle over an always-on emulator or separate containers. A small in-image controller remains necessary for that behavior. This is a development image with a JDK, SDK, emulator and viewer, not a distroless image.
