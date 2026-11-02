# Review Rembric's upstream OpenCode V2 adapter

## Why

Upstream Rembric introduced its own V2 adapter in plugin v0.36.0. The local adapter was independently implemented before that release. Its package README incorrectly says upstream only ships V1. Both vendored protocol files remain byte-identical to upstream plugin v0.39.0, but matching core files do not establish adapter or server-protocol compatibility.

## What changes

This branch records an investigation and asks for a decision, not an implementation. Compare the local and upstream V2 adapters against authoritative OpenCode V2 documentation and the active Rembric server. Determine whether to retain the local adapter, port specific fixes or adopt the upstream adapter. Correct the local README when the decision is implemented.

No behavior change is proposed in this investigation-only branch. Any approved adapter behavior change requires capability deltas and isolated lifecycle verification before publication. Never install an adapter into a host plugin directory as a test.

## Decision

Operator input is required before changing adapter ownership or behavior. The evidence is not yet sufficient to recommend replacing the local implementation.
