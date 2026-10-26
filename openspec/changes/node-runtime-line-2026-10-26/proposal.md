# Node runtime line (held)

## Why

The scheduled maintenance pass of 2026-10-26 established that upstream OpenChamber declares `engines.node >= 24.14.0` and `.nvmrc` `lts/krypton` for every release from 2.2.0 through 2.5.2, while both published images run `gcr.io/distroless/nodejs22-debian12`. The bundle also imports `node:sqlite` (`server/lib/spaces/places/escape-suite.js`), which is stable on Node 24 and experimental on Node 22.

The deployed 2.5.1 container is healthy on Node 22, so the floor is advisory in practice and nothing is broken today. But the app is running outside its declared support range, and an upstream change that depends on a Node 24 API would fail only at runtime.

## Scope

- Move the app and browser runtime stages from `nodejs22-debian12` to `nodejs24-debian12`.
- Update both image checks' Node major assertion.
- Keep the bundle stage on the Debian Node image it uses for download, patching and `npm install`; it never runs the server.
- Update the app README's runtime statement.

The sandbox image's own Node 22 toolchain is a separate decision for its consumers and stays unchanged.

## Alternatives

- **Stay on Node 22** with the divergence documented. Lowest change, keeps the current footprint, leaves the app outside the upstream floor and every future release unchecked against it.
- **Move only the app image.** Smaller blast radius, but the two published images would run different Node lines while sharing the same distroless base family and checks.
- **Move both runtime images** (this proposal). One line across both images, both checks pass, sizes differ by under 0.2 MB.

## Status

Adopted by the operator on 2026-10-26: both published images move to `nodejs24-debian12`. It changes the runtime base line of both published images, which is a runtime-stack decision beyond routine maintenance, so the closing pass still includes live verification against the running OpenCode 2.1.4 server, WebAuthn, terminal and Git paths and the browser MCP.

## Evidence

See [evidence.md](evidence.md), extended by the closing pass.
