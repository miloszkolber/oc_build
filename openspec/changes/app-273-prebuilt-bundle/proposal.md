# Adapt the app image to OpenChamber 2.7.3's prebuilt bundle

## Why

Scheduled Build runs 44665863773 and 44728488335 failed while building the newly released OpenChamber 2.7.3. Its release tarball replaced the `server/` and `bin/` source layout with a prebuilt `build/` tree, so both strict patches had no target file and the build failed closed, as designed.

## What Changes

Retarget the self-update and home-repository patches to the compiled files in the new layout, copy `build/` instead of `bin/` and `server/`, and move the entrypoint CLI path to `build/bin/cli.js`. The image check, entrypoint regression and strict zero-fuzz patch behavior are unchanged. The pinned behaviors are identical: in-app self-update stays disabled and `OPENCHAMBER_ALLOWED_HOME_REPOSITORY` still opts in to exactly one existing home-root checkout.

Patching now targets upstream's compiled output. Its shipped source maps become stale for the patched regions; runtime stack traces may resolve patched lines to slightly wrong original positions.
