# Evidence

The [1.65.1 release](https://github.com/microsoft/playwright/releases/tag/v1.65.1) notes two test-runner fixes and a browser revision. The [13-commit comparison](https://github.com/microsoft/playwright/compare/v1.65.0...v1.65.1) was inspected at commit-subject and changed-file level. Changes under `packages/playwright-core` are browser metadata, package version and Chromium protocol TypeScript declarations. The sandbox does not download a Playwright browser; `docker/sandbox/browser-cli.mjs` connects to Obscura over CDP. The npm manifest requires Node >=20, met by the sandbox.

The local sandbox rebuilt and passed its offline image check as UID 1000, documentation checker, nine tests and strict OpenSpec validation. A sandbox browser CDP evaluation returned the expected DOM content. An isolated loopback server was inaccessible without `--allow-private-network` and accessible with it. These checks are sandbox browser evidence, not native desktop acceptance.

Sandbox CI `43888649671` and documentation CI `43888649461` passed on `fbc8d3f`. Published `latest` resolved to `sha256:5a9ea05a029c8fcfbc4127b89ce92719b2159d57413dafe7512aa8b4186fcdf4` with the expected revision label. The sandbox service pulled it and reported playwright-core 1.65.1 and the expected `browser text` result.
