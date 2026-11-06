# Third-party attribution

Applies to upstream components only; it grants no license over this repository's own build scripts or workflow.

## OpenChamber image

The image downloads an upstream OpenChamber web release (MIT, `Copyright (c) 2025 Bohdan Triapitsyn`) and applies the self-update guard. The upstream license ships in the image at `/usr/share/licenses/openchamber/LICENSE` and in this repository as [`docker/openchamber/openchamber-licence.txt`](docker/openchamber/openchamber-licence.txt). Production dependencies keep their own notices under `node_modules`; the distroless base and the copied git/bash binaries retain their respective licensing.

## Sandbox browser

The sandbox image downloads [Obscura](https://github.com/h4ckf0r0day/obscura) v0.2.6 (Apache-2.0) release binaries and installs its license under `/usr/local/share/licenses/obscura/`. It installs `playwright-core` 1.65.0 (Apache-2.0) from npm without bundled browsers and copies its license to `/usr/local/share/licenses/playwright-core-LICENSE`. The `browser` wrapper in `docker/sandbox/browser-cli.mjs` is part of this repository.
