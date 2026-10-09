# Third-party attribution

Applies to upstream components only; it grants no license over this repository's own build scripts or workflow.

## Rembric OpenCode plugin

`extensions/rembric/core/` vendors two files unmodified from [Rembric](https://github.com/susomejias/rembric) (`apps/plugin/bin/rembric-plugin-core.mjs` and `apps/plugin/mcp-bridge/rembric-dotenv.mjs`). Rembric is MIT licensed; see [`extensions/rembric/NOTICE`](extensions/rembric/NOTICE). The surrounding V2 adapter in `extensions/rembric/index.ts` is independently written against OpenCode's documented plugin API. The built bundle is self-contained: the default export is a plain `{ id, setup }` object, so no runtime dependency is redistributed or required.

## OpenChamber image

The image downloads an upstream OpenChamber web release (MIT, `Copyright (c) 2025 Bohdan Triapitsyn`) and applies the self-update guard. The upstream license ships in the image at `/usr/share/licenses/openchamber/LICENSE` and in this repository as [`docker/openchamber-licence.txt`](docker/openchamber-licence.txt). Production dependencies keep their own notices under `node_modules`; the distroless base and the copied git/bash binaries retain their respective licensing.

The browser runtime uses Debian Bookworm Chromium and its runtime libraries. The build retains each installed Debian package's copyright notice under `/usr/share/licenses/debian/` in the final image, including the `chromium` and `chromium-common` notices.

The browser image packages the standalone `browser/` runtime at `/opt/browser`. It was extracted from the archived `extensions/agent-browser` adaptation of Server Browser v0.7.0 (upstream commit `6c5e76ddfa21b574d0521a27f408cd643673161c`, MIT, `Copyright (c) 2025 Bohdan Triapitsyn`). It is not an upstream Server Browser release. See the package's `NOTICE` and `THIRD_PARTY_LICENSES` for provenance. Attribution ships under `/usr/share/licenses/browser/`. The archived extension is not included in either image.
