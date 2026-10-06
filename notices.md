# Third-party attribution

Applies to upstream components only; it grants no license over this repository's own build scripts or workflow.

## Signet lifecycle plugin

`plugin/` derives from Signet `0.226.27`, revision [`b8b0c56`](https://github.com/Signet-AI/signetai/tree/b8b0c5641e3d90c8b4622f78cfd6cff1877b2a73), with checkpoint and session-end contracts reviewed against `0.230.8`, revision [`df33b03`](https://github.com/Signet-AI/signetai/tree/df33b037300114abcd70b5bc2b7bd06366b5deb0). Upstream is Apache-2.0, `Copyright 2025 Signet AI`. [`plugin/LICENSE`](plugin/LICENSE) is an exact upstream copy; [`plugin/NOTICE`](plugin/NOTICE) retains the upstream notice and appends the local port's modifications.

## Bundled YAML parser

The plugin bundle includes `yaml@2.6.0`, Copyright Eemeli Aro, under the ISC license retained in [`plugin/yaml-licence.txt`](plugin/yaml-licence.txt). `@opencode/plugin` stays external, so the host supplies that runtime.

## OpenChamber image

The image downloads an upstream OpenChamber web release (MIT, `Copyright (c) 2025 Bohdan Triapitsyn`) and applies the self-update guard. The upstream license ships in the image at `/usr/share/licenses/openchamber/LICENSE` and in this repository as [`openchamber-licence.txt`](openchamber-licence.txt). Production dependencies keep their own notices under `node_modules`; the distroless base and the copied git/bash binaries retain their respective licensing.
