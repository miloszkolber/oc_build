# Third-party attribution

Applies to upstream components only; it grants no license over this repository's own build scripts or workflow.

## Rembric OpenCode plugin

`plugin/core/` vendors two files unmodified from [Rembric](https://github.com/susomejias/rembric) (`apps/plugin/bin/rembric-plugin-core.mjs` and `apps/plugin/mcp-bridge/rembric-dotenv.mjs`). Rembric is MIT licensed; see [`plugin/NOTICE`](plugin/NOTICE). The surrounding V2 adapter in `plugin/index.ts` is independently written against OpenCode's documented plugin API. The built bundle is self-contained: the default export is a plain `{ id, setup }` object, so no runtime dependency is redistributed or required.

## OpenChamber image

The image downloads an upstream OpenChamber web release (MIT, `Copyright (c) 2025 Bohdan Triapitsyn`) and applies the self-update guard. The upstream license ships in the image at `/usr/share/licenses/openchamber/LICENSE` and in this repository as [`openchamber-licence.txt`](openchamber-licence.txt). Production dependencies keep their own notices under `node_modules`; the distroless base and the copied git/bash binaries retain their respective licensing.
