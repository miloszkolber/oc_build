# Close the remaining app runtime and toolchain review gaps

## Why

Completing the deferred review found a runtime mismatch in the app image. Upstream 2.6.0 extracts downloaded `.tar.bz2` dictation models with `tar xf`, which relies on GNU tar's compression auto-detection. The image deliberately replaced Debian tar with a BusyBox symlink; BusyBox `tar xf` fails with `short read` on bzip2 and only supports `-j`. Local dictation model installation therefore fails on Linux.

Also current: OpenSpec 1.16.0 passes this repository's strict validation and raises its npm Node floor to 22.12, which the sandbox's Node 22.23 meets. pnpm 11.28.10 is the current 11.x patch.

## What changes

Keep GNU tar in the app image and add `bzip2`/`bunzip2` BusyBox applets so auto-detected bzip2 extraction works. Add an offline regression that checks GNU tar and extracts a bundled `.tar.bz2` fixture. Refresh the sandbox's pnpm to 11.28.10 and OpenSpec to 1.16.0 across the image, check, README, documented pins and documentation workflow.

The `7zip-bin` binary ships non-executable because install scripts are skipped, but upstream executes it only on Windows, so it is not used by this Linux image. node-pty and simple-git changed upstream; the live app passes PTY and Git checks. No requirement changes are needed.
