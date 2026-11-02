# Review Rembric's upstream OpenCode V2 adapter

## Why

Upstream Rembric introduced its own V2 adapter in plugin v0.36.0. The local adapter was independently implemented before that release. Its package README incorrectly says upstream only ships V1. Both vendored protocol files remain byte-identical to upstream plugin v0.39.0, but matching core files do not establish adapter or server-protocol compatibility.

## What changes

This branch records an investigation and asks for a decision, not an implementation. Compare the local and upstream V2 adapters against authoritative OpenCode V2 documentation and the active Rembric server. Determine whether to retain the local adapter, port specific fixes or adopt the upstream adapter. Correct the local README when the decision is implemented.

No behavior change is proposed in this investigation-only branch. Any approved adapter behavior change requires capability deltas and isolated lifecycle verification before publication. Never install an adapter into a host plugin directory as a test.

## Decision

Retain the independently written local adapter. It is the deployed implementation, loads on OpenCode 2.2.5, uses the same documented V2 hook surface as upstream (prompt/context/tool hooks and an event subscription), and its vendored protocol matches upstream byte-for-byte. Replacing it would change adapter ownership and require an isolated lifecycle fixture that this repository does not have. Upstream remains a reference; no behavior change is implemented here.
