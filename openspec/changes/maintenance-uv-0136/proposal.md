# Refresh uv in the sandbox

## Why

uv 0.13.6 prevents `uv run --active --script` and `uv sync --active --script` from deleting a nonempty active destination that is not a virtual environment. The sandbox exposes uv to multiple development projects, so preserving non-virtualenv directories is important.

## What changes

Refresh the copied uv and uvx binaries from 0.13.5 to 0.13.6. Update the image assertion and package README. The release also refreshes managed CPython patch versions. It does not change the sandbox's mounts, permissions or deployment.

This is a patch-level toolchain refresh with no intended repository contract change. The existing sandbox specification remains applicable.
