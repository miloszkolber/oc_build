# Third-party attribution

These notices describe upstream components only. They do not apply a blanket license to this private repository's independently authored build scripts, workflow, or other original code.

## Signet lifecycle port

`plugins/signet-opencode-v2/` derives from Signet `0.226.27`, revision [`b8b0c5641e3d90c8b4622f78cfd6cff1877b2a73`](https://github.com/Signet-AI/signetai/tree/b8b0c5641e3d90c8b4622f78cfd6cff1877b2a73), with checkpoint/session-end contracts reviewed against `0.230.8`, revision [`df33b037300114abcd70b5bc2b7bd06366b5deb0`](https://github.com/Signet-AI/signetai/tree/df33b037300114abcd70b5bc2b7bd06366b5deb0). Upstream supplies Apache License 2.0 and the notice `Copyright 2025 Signet AI`. The plugin's [LICENSE](plugins/signet-opencode-v2/LICENSE) is an exact upstream copy; [NOTICE](plugins/signet-opencode-v2/NOTICE) retains the exact upstream notice and appends local V2-port modifications. Behavior and limitations are documented in its README.

## Bundled YAML parser

The plugin bundle includes `yaml@2.6.0`, Copyright Eemeli Aro. Its actual npm metadata and distributed license are ISC, not MIT. The exact [yaml-LICENSE](plugins/signet-opencode-v2/yaml-LICENSE) is retained alongside the bundle. Source: [`eemeli/yaml` tag `v2.6.0`](https://github.com/eemeli/yaml/blob/v2.6.0/LICENSE) and [npm package metadata](https://registry.npmjs.org/yaml/2.6.0). The artifact keeps `@opencode/plugin` external and therefore does not redistribute that runtime as bundled code; the host must supply the documented API-compatible runtime.

## OpenChamber image

The image downloads the upstream OpenChamber web release and applies the image-managed self-update guard. OpenChamber `v2.0.1` is MIT licensed, `Copyright (c) 2025 Bohdan Triapitsyn`. The exact upstream [LICENSE](assets/licenses/openchamber-LICENSE) is included in the image at `/usr/share/licenses/openchamber/LICENSE`; source: [`openchamber/openchamber` tag `v2.0.1`](https://github.com/openchamber/openchamber/blob/v2.0.1/LICENSE). Production dependencies retain their own distributed notices under `node_modules`; Debian/Node base-image components retain their respective licensing. Review upstream licensing if a future release changes it.
