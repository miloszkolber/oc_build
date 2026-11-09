# Stop rolling prereleases from breaking discovery and refresh sandbox pins

## Why

Upstream now publishes multiple rolling GitHub prereleases with non-versioned tags (`canary`, `asr-models`). Discovery skipped only `canary`, so scheduled Build runs fail with `Expected v-prefixed release tag` before reaching stable releases.

## What changes

Treat every prerelease with a non-`v` tag as a rolling artifact to skip, while malformed `v`-prefixed tags still fail. Refresh copied tools: uv 0.13.7, pnpm 11.28.11 and OpenSpec 1.16.1. OpenSpec 1.16.1 makes delta validation stricter; this repository passes it.

No permissions, mounts or deployment topology change.
