# Refresh sandbox security dependencies

## Why

Obscura 0.2.7 and pnpm 11.28.12 include security fixes. The operator approved their compatibility and control-boundary changes.

## What Changes

Update Obscura and pnpm, retaining the existing browser CLI, private-network opt-in and offline checks. Obscura accepts the endpoint's own HTTP origin on CDP by default in addition to origin-free native clients. pnpm rejects registry placeholders and requires newer compatible pnpr servers for remote resolution.
