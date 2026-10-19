# Maintenance state

High-water mark for the scheduled dependency-maintenance pass over this repository. Each entry records what was actually read and its disposition. A reviewed revision is not a claim that every scenario was executed, and a missing cursor means unseen history, not "current".

## Run 2026-10-19

Local revision reviewed: `d308ce4` (`main`). Environment: host Docker for image builds; development checks run in the workspace sandbox image.

### Reviewed revisions

| Component | Pinned or resolved in this repository | Reviewed revision | Source | Disposition |
| --- | --- | --- | --- | --- |
| Upstream OpenChamber app release | `latest` resolved at build | v2.4.0 (release `415482841`, published 2026-10-17); web asset sha256 `9c523486fb20bf4ae6994b900f2f6d556f277d1d8dc9e98003fc46f45ae63ecb` | `openchamber/openchamber` release bodies for 2.3.2, 2.3.3, 2.4.0 + `git diff v2.2.0 v2.4.0` for `packages/sdk` | Pipeline built, checked and promoted it automatically (run `38990238610`); published tag `2.4.0-r415482841`, manifest digest `sha256:ba91239d711b9ed0184a65de4a228cb7857ce1003b476d1092cf9689e85e29c8`. Both strict patches apply to the 2.4.0 bundle with `--fuzz=0`. Top-level bundle layout unchanged from 2.3.1. No repository change |
| Canvas `@openchamber/sdk` | `2.2.0` | 2.4.0 | `packages/sdk` diff 2.2.0..2.4.0 (`contract.ts`, `API.md`, `GUEST_SERVICES.md`, `ui/`) | Additive only: new `GUEST_UI_LOOK_CSS` export, `GUEST_REQUEST_RESPONSE_MAX` raised to 8 MB, new `REQUEST_FAILED` / `RESPONSE_TOO_LARGE` codes, restyled UI kit. No breaking API for the panel's `connectHost` / `applyHostReady` / `applyHostTheme` / `parseManifest` use. Dependabot-owned bumps |
| Canvas other Bun packages | lockfile | esbuild 0.28.2, mermaid 12.1.0, react 19.3.0, zod 4.6.5, `@json-render/*` 0.21.0 | npm dist-tags; mermaid 12.2.0 release notes | mermaid 12.2.0 is one opt-in mindmap option plus patch fixes; `@json-render/*` 0.21.1 and zod 4.6.7 are patches. No semantic breakage found. Dependabot PRs #6–#10 have green Canvas and documentation CI. Left to Dependabot |
| Browser Bun packages | `ws` 8.22.0, esbuild 0.28.2 | current | npm dist-tags | No open Dependabot PR; nothing newer with a security driver |
| Browser Chromium and fonts | apt resolution from `debian:bookworm-slim` | built image 2026-10-15 carries Chromium 155.0.8059.39; `bookworm-security` now offers 155.0.8059.79-1~deb12u1 | Debian `bookworm` and `bookworm-security` package lists | Mutable by design. The weekly browser rebuild (Monday 04:37 UTC) adopts it without a repository change. Refresh latency is up to seven days |
| Bun base image | `oven/bun:1.4.3` | bun-v1.4.3 (2026-10-10) | `oven-sh/bun` releases and tags (no 1.4.4/1.5) | Current; no action |
| Node 22 base and distroless | `node:22-bookworm-slim`, `gcr.io/distroless/nodejs22-debian12` | Node 22.23.3; distroless `latest` digest `sha256:8a3e96fe3345b5d83ecec2066e7c498139a02a6d1214e4f6c39f9ce359f3f5bc` | `nodejs/node` releases, registry tag resolution | Current; resolved at build time |
| Debian base | `debian:bookworm-slim` | index digest `sha256:7c7b2c966bc9ee8cedfeef67e0e279108992c77681fa595db4a9d65c06ccc587` (2026-10-06) | Docker Hub tag metadata | Mutable; rebuild refreshes |
| Go toolchain | `golang:1.25-bookworm` | go1.25.14 (2026-08-19), the final 1.25 patch; index digest `sha256:3b4a11519ad929d1e1d261a12cff056f0c85b735253d7d861346b9c6f8b36437`. Supported lines are 1.26.9 and 1.27.2 | `go.dev/dl`, Go release notes, OSV `stdlib` query | Held for operator input: 12 stdlib advisories published 2026-10-08 are fixed only on 1.26/1.27. Prepared on `maintenance/go-toolchain-line-2026-10-19`; not merged |
| uv | `ghcr.io/astral-sh/uv:0.13.0` | 0.13.1 (2026-10-14); index digests 0.13.0 `sha256:cdc6093146eb3ff6a40107b38f008b789e050e77ad87865e381d9917da55a168`, 0.13.1 `sha256:4a1f3666816dafadd20ceb71eac9a7d56d7ef30279f7d64048519ab901ada336` | `astral-sh/uv` 0.13.1 release notes | Bumped to 0.13.1 (patch fixes only, no security or breaking change) |
| pnpm | `11.28.5` | 11.28.6 (2026-10-15) | pnpm v11.28.6 release notes | Bumped: security fix for a CI identity token sent to a registry it was not issued for, plus repair of the `httpProxy`/`httpsProxy` regression 11.28.5 introduced |
| `@fission-ai/openspec` | `1.14.1` | 1.14.3 (npm latest) | Changelog for 1.14.2 and 1.14.3; npm manifest dependency diff | Bumped: 1.14.3 drops the `fast-glob`/`braces` chain named by GHSA-vfj7-8cjw-p6xm and fixes `validate --all` spinning on a zero-width TTY; 1.14.2 adds strict warnings for delta text archive would drop |
| Rembric vendored core | `core/rembric-plugin-core.mjs` sha256 `481a1d6e…267704`, `core/rembric-dotenv.mjs` sha256 `639bf8c4…4bb7b` | plugin v0.34.1 (2026-10-16); server v0.29.4 | `susomejias/rembric` release notes and raw files at `plugin-v0.34.1` | Files byte-identical at v0.34.1 (v0.34.1 changed only the pi-plugin). Nothing to re-vendor. Cursor advanced without a repository change |
| GitHub Actions | SHA-pinned | current | `gh run list`, Dependabot queue | Dependabot-owned; no open Actions pull request |

### Advisories checked

- Go `stdlib` via the OSV API: 180 entries; 12 published 2026-10-08 (GO-2026-6599 through GO-2026-6617) covering `html/template`, `net/http`, `net/textproto`, `crypto/tls`, `os` and the go command. Fixed in go1.26.9 and go1.27.2; not backported to the 1.25 line the sandbox still copies.
- GHSA-vfj7-8cjw-p6xm (`braces`) reached the sandbox only through `@fission-ai/openspec@1.14.1` → `fast-glob`; the 1.14.3 dependency set removes it.
- pnpm: the 11.28.6 security entry above. The 11.1.2 advisories closed on 2026-10-13 remain closed.

### Published and merged in this run

| Item | Reference |
| --- | --- |
| Local revision reviewed | `d308ce4` (`main` before this run) |
| Routine fix commit | `08e03f6` on `main` |
| Checklist in CI | Documentation contracts run `39198568876`, Sandbox image run `39198568981`, both `push` and successful |
| Republished sandbox image | `ghcr.io/<owner>/openchamber-sandbox:sha-08e03f69a7516a525a0d59ddf5e103fc8f38819c` and `:latest`, manifest digest `sha256:baf1f9c70e012c51596b9e03a3bca39c886bfe69a2da0308d87e014fb90b0742` |
| App image, promoted by the pipeline | `2.4.0-r415482841`, manifest digest `sha256:ba91239d711b9ed0184a65de4a228cb7857ce1003b476d1092cf9689e85e29c8` |
| Held for operator input | `maintenance/go-toolchain-line-2026-10-19`, commit `9f5725d`, local only, not pushed |

### Failed or inaccessible sources

- The GHCR and GCR registry HTTP APIs answer 401 without a token; image manifests were read with `docker manifest inspect` / `docker buildx imagetools inspect` instead.
- `vuln.go.dev` module index paths return 404 for `stdlib`; the OSV query API was used for Go advisories.
- `golang/go` and `GoogleContainerTools/distroless` publish no GitHub releases, so `go.dev/dl` and registry tag resolution were used instead of release bodies.

### Pending checks

- Rembric live lifecycle (registration, recall, reporting) against the running OpenCode/Rembric pair. Bundle contract only; see [backlog](backlog.md).
- Consumer builds under a Go 1.26 line, which the held branch prepares.
- Chromium update pick-up by the next weekly browser rebuild, which publishes through automation rather than this repository's edits.

## Run 2026-10-13

Recorded in memory by that run and reconciled here; the versions it inherited were not re-verified. It reviewed upstream 2.3.1, Bun 1.4.2 → 1.4.3, pnpm 11.1.2 → 11.28.5, `@fission-ai/openspec` 1.14.1, uv 0.13.0, Node 22.23.3, go1.25.14, Rembric plugin v0.34.0 against server 0.29.4, Canvas `@openchamber/sdk` 2.2.0 and the Bun lockfiles. It re-vendored the Rembric core and merged the sandbox pin changes in `a76453a`. Dependabot had no open pull requests. No repository-owned state file existed before the 2026-10-19 run; its evidence is the change folder, the [change history](changes/history.md) entry and this record.
