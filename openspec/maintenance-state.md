# Maintenance state

High-water mark for the scheduled dependency-maintenance pass over this repository. Each entry records what was actually read and its disposition. A reviewed revision is not a claim that every scenario was executed, and a missing cursor means unseen history, not "current".

## Run 2026-10-26

Local revision reviewed: `7be9e49` (`main`). Environment: host Docker for image builds; development checks run in the rebuilt workspace sandbox image.

Cursor advanced from 2026-10-19 to this run. OpenChamber 2.5.0 and 2.5.1 were not reviewed by the previous entry; they were reviewed here from their release bodies, the 2.4.0 to 2.5.2 bundle diff and the published tags, together with 2.5.2.

### Reviewed revisions

| Component | Pinned or resolved in this repository | Reviewed revision | Source | Disposition |
| --- | --- | --- | --- | --- |
| Upstream OpenChamber app release | `latest` resolved at build | 2.5.0 (release `417488689`), 2.5.1 (`421325791`), 2.5.2 (`423752016`, published 2026-10-26T00:48:10Z) | Release bodies for 2.5.0-2.5.2, `openchamber-web-*.tgz` package manifests and trees, strict patch dry-runs | 2.5.0 and 2.5.1 were built, checked and promoted by the pipeline (tags `2.5.0-r417488689` digest `sha256:e1ef77edb23236aa83f4900922ca471878ebc32a4ce5e90b4b4a4a4578b20dd0`; `2.5.1-r421325791` digest `sha256:8ef4ddde1d3876fa19b149c4f900ea64b41356135291eed5041712b985f5607a` as `latest`). 2.5.2 broke `home-repository.patch`: upstream replaced `isGitRepository` with a combined `probeRepository`. Patch adapted and verified; see the merged fix. Bundle layout unchanged (bin, dist, package.json, public, README.md, server). Dependency delta: `@openchamber/sdk` 2.4.0 to 2.5.2, `@opencode/client`/`@opencode/schema` 2.0.32 to 2.1.4, `bun-pty` `^0.4.5` to exact `0.5.1`; nothing else. 2.5.1 requires OpenCode 2.1.0 or newer; 2.5.2's diagnostics memory snapshot needs 2.1.4. Host OpenCode is 2.1.4. New external commands in the bundle (`git-annex`, `sqlite3`, `lsof`, `systemd-run`) are optional or pre-existing, and upstream's dev-server scan falls back to `/proc` when `lsof` is absent |
| Node runtime floor | `gcr.io/distroless/nodejs22-debian12` (Node 22) | upstream `engines.node` for 2.2.0, 2.3.1, 2.4.0 and 2.5.2 is `>=24.14.0`; `.nvmrc` is `lts/krypton` | npm package manifests in each `openchamber-web` tarball, upstream root `package.json` at `v2.5.2`, bundle imports (`node:sqlite` in `server/lib/spaces/places/escape-suite.js`) | Held for operator input: the app declares Node 24 LTS while both images run distroless Node 22. Working in practice on the deployed 2.5.1 container, but outside the declared floor. Branch `maintenance/node-runtime-line-2026-10-26` carries evidence; not merged |
| Canvas `@openchamber/sdk` | `2.2.0` | 2.5.2 | `@openchamber/sdk` 2.2.0 and 2.5.2 tarballs (`API.md`, `dist/*.d.ts`), OpenChamber API.md diff | Additive: late `generate` answers, `links` on session records, status sections the app draws, source-control providers, 8 MB response cap, `GUEST_UI_LOOK_CSS`. `connectHost`, `applyHostReady`, `parseManifest` and the manifest schema used by the Canvas build are unchanged. Dependabot PR #7 still sits at 2.3.2; Dependabot-owned |
| Canvas other Bun packages | lockfile | `@json-render/*` 0.21.3, mermaid 12.2.0, zod 4.6.7, react/react-dom 19.3.1, esbuild 0.28.2, fflate 0.8.3 | npm dist-tags and release bodies for json-render 0.21.1-0.21.3, mermaid 12.2.0, zod 4.6.6/4.6.7 | All patches or one opt-in mermaid option; no semantic breakage found. Open Dependabot PRs #6-#10 have green Canvas and documentation CI and stay with Dependabot |
| Browser Bun packages | `ws` 8.22.0, esbuild 0.28.2 | current | npm dist-tags | Nothing newer exists; no open Dependabot PR |
| Browser Chromium and fonts | apt resolution from `debian:bookworm-slim` | built image of 2026-10-19 carries Chromium 155.0.8059.79; `bookworm-security` now offers 156.0.8078.47-1~deb12u1 | Debian `bookworm` and `bookworm-security` package lists | Mutable by design; the weekly browser rebuild adopts it. A local rebuild on 2026-10-26 resolved 156.0.8078.47 and passed the real Chromium check |
| Browser runtime closure | apt resolution | `ca-certificates` 20250419~deb12u2, `libnss3` 3.87.1-1+deb12u4, `fonts-liberation` 1:1.07.4-11, `fonts-inter` 4.0~beta7+ds-1, `fonts-jetbrains-mono` 2.242+ds-3, `fonts-noto-color-emoji` 2.042-0+deb12u1 | `bookworm` and `bookworm-security` lists, compared with the 2026-10-19 image record | Certificates moved to `deb12u2`; the next weekly rebuild adopts it. Fonts unchanged |
| Bun base image | `oven/bun:1.4.4` | bun-v1.4.4 (2026-10-22); index digest `sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d` | `oven-sh/bun` release and v1.4.4 blog notes | Bumped 1.4.3 to 1.4.4: security fixes for TLS, WebSocket, database clients and the package manager, a compile-cache exit regression fix, and NSS 3.131.1 roots. Upstream OpenChamber moved its own images to 1.4.4 in 2.5.1 |
| Node 22 base and distroless | `node:22-bookworm-slim`, `gcr.io/distroless/nodejs22-debian12` | Node 22.23.4 (2026-10-20); distroless `latest` digest `sha256:8a3e96fe3345b5d83ecec2066e7c498139a02a6d1214e4f6c39f9ce359f3f5bc` | `nodejs/node` release index, registry resolution | Build-resolved and current. Distroless `nodejs24-debian12` also exists (digest `sha256:61f4f4341db81820c24ce771b83d202eb6452076f58628cd536cc7d94a10978b`); see the held runtime-line row |
| Debian base | `debian:bookworm-slim` | mirror index digest `sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8` (previous record `sha256:7c7b2c96…` on 2026-10-06) | `mirror.gcr.io` tag resolution | Mutable; rebuild refreshes. `node:22-bookworm-slim` mirror index is now `sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d` |
| Go toolchain | `golang:1.25-bookworm` | go1.25.14, index digest `sha256:3b4a11519ad929d1e1d261a12cff056f0c85b735253d7d861346b9c6f8b36437` (unchanged) | tag resolution | Unchanged since the 2026-10-19 hold. The 12 stdlib advisories published 2026-10-08 are still unfixed on this line; branch `maintenance/go-toolchain-line-2026-10-19` remains held for operator input |
| uv | `ghcr.io/astral-sh/uv:0.13.5` | 0.13.5 (2026-10-22); index digest `sha256:32a7bb39b496babbd997b0a39a4d66c126bdaf5661b302bf6f06abda8deca6ff` | `astral-sh/uv` release notes for 0.13.2-0.13.5 | Bumped 0.13.1 to 0.13.5: GHSA-hq85-5cpj-mr62 compromised eMudhra/emSign root, rebuilt managed CPython (3.15.1, 3.14.9, 3.13.17), retry and resolver fixes |
| pnpm | `11.28.8` | 11.28.8 (2026-10-22) | pnpm release notes | Bumped 11.28.6 to 11.28.8: standalone builds now embed Node.js 26.12.1 instead of 26.0.0, which still trusted the October 2026 distrusted CA intermediates. 12.15.0 remains the next major line, deferred in the backlog |
| `@fission-ai/openspec` | `1.15.0` | 1.15.0 | Changelog 1.15.0 and 1.14.3 | Bumped: standalone binaries (not adopted), `update --dry-run`, `/opsx:verify` matching a REMOVED requirement by exact name, faster `--json` startup. `validate --all --strict` and the local checker pass |
| Rembric vendored core | `core/rembric-plugin-core.mjs` sha256 `481a1d6e…267704`, `core/rembric-dotenv.mjs` `639bf8c4…4bb7b` | plugin v0.35.0 (2026-10-20); server v0.30.2 (2026-10-21) | Release bodies for plugin-v0.35.0 and server-v0.30.0-0.30.2; raw files at `plugin-v0.35.0` | Files byte-identical at v0.35.0, so nothing to re-vendor. The breaking change is in the MCP write tools (`memory.save` and `memory.capture_passive` require 1-64 ASCII-transliterated tags), not in the session protocol this plugin uses; the host server image was rebuilt 2026-10-22 and the agent-side calls carry tags |
| GitHub Actions | SHA-pinned | current: checkout v7.0.1, setup-bun v2.2.0, upload-artifact v7.0.2 | `gh` release lists | Dependabot-owned; no open Actions pull request |

### Advisories checked

- uv GHSA-hq85-5cpj-mr62 (compromised eMudhra/emSign root CA) fixed in 0.13.4 and carried by 0.13.5; the same root update appears in Bun 1.4.4 (NSS 3.131.1), the pnpm 11.28.8 embedded Node, Node 22.23.4 and Debian `ca-certificates` 20250419~deb12u2.
- Bun 1.4.4 security section: TLS, HTTP/1.1-3, WebSocket, Brotli, `Bun.serve`/`listen`/`connect`, `Bun.SQL`, `Bun.RedisClient`, `node:tls`/`http`/`http2`/`net`/`quic`/`crypto`/`vm`/`v8`, `ws`, `fetch` and the package-manager commands. The advisory identifiers are not listed upstream; the release notes are the source.
- Go `stdlib` advisories from 2026-10-08 (GO-2026-6599 through GO-2026-6617) remain unfixed on the 1.25 line; unchanged from the 2026-10-19 entry.
- Chromium 155.0.8059.79 to 156.0.8078.47 arrives only through `bookworm-security`; no separate advisory review was performed beyond the Debian security suite providing it.

### Published and merged in this run

| Item | Reference |
| --- | --- |
| Local revision reviewed | `7be9e49` (`main` before this run) |
| Routine fix commit | `00fc2e5` on `main` |
| App image, promoted by the pipeline before this run | `2.5.1-r421325791`, digest `sha256:8ef4ddde1d3876fa19b149c4f900ea64b41356135291eed5041712b985f5607a` (`latest`) |
| App image 2.5.2 | Tag `2.5.2-r423752016` and `latest`, manifest digest `sha256:427350131a938ec34718c8efaf2804ff3dd7deea604e24ee588b4f94c7caefe4`, from Build run `40273116782` |
| Republished sandbox image | `sha-00fc2e55c326ad49f586f9d877fd8790c2922814` and `latest`, digest `sha256:3a15a5795d6e6d5a3dea8afe4abf5758f111d14f5b69f89dc2013e7d93d34898`, from Sandbox image run `40273116735` |
| Republished browser image | `1.1.2-00fc2e55c326ad49f586f9d877fd8790c2922814` and `latest`, digest `sha256:d33e1ace0749dd3ce44c67aa23349a5d076f0335aca2480ffc8cd1ee2218b0c7`, Chromium 156.0.8078.47, from Browser image run `40273116728` |
| Held for operator input | Node runtime line (local branch `maintenance/node-runtime-line-2026-10-26`, commit `b3ac93e`, not pushed) and the Go toolchain line (branch `maintenance/go-toolchain-line-2026-10-19`); see the backlog |

### Failed or inaccessible sources

- The GHCR and GCR registry HTTP APIs answer 401 without a token; image manifests were read with `docker buildx imagetools inspect` instead.
- `vuln.go.dev` module index paths return 404 for `stdlib`; Go advisories were not re-queried this run because the toolchain line did not change.
- `mirror.gcr.io/docker/dockerfile:1` failed three times while fetching one 14.28 MB frontend layer ("not found") between 05:14 and 05:17 UTC, failing the Build, Sandbox image and Browser image runs at the frontend pull. The blob then served normally over HTTP and the same runs passed on rerun with no repository change. The existing contract is to fail explicitly rather than fall back to a rate-limited Docker Hub pull; no workflow change was made.

### Pending checks

- Rembric live lifecycle (registration, recall, reporting) against the running OpenCode/Rembric pair. Bundle contract only; see [backlog](backlog.md).
- Consumer builds under a Go 1.26 line, which the held 2026-10-19 branch prepares.
- App image under a Node 24 runtime line, which the held 2026-10-26 branch prepares.
- Further Chromium patch pick-up by the weekly browser rebuilds. This run's browser build already published Chromium 156.0.8078.47. The scheduled windows are not punctual: the 2026-10-19 window ran at 10:00 and 10:12 UTC for the sandbox and browser jobs rather than 04:23 and 04:37.

## Run 2026-10-19

Local revision reviewed: `d308ce4` (`main`). Environment: host Docker for image builds; development checks run in the workspace sandbox image.

### Reviewed revisions

| Component | Pinned or resolved in this repository | Reviewed revision | Source | Disposition |
| --- | --- | --- | --- | --- |
| Upstream OpenChamber app release | `latest` resolved at build | v2.4.0 (release `415482841`, published 2026-10-17); web asset sha256 `9c523486fb20bf4ae6994b900f2f6d556f277d1d8dc9e98003fc46f45ae63ecb` | `openchamber/openchamber` release bodies for 2.3.2, 2.3.3, 2.4.0 + `git diff v2.2.0 v2.4.0` for `packages/sdk` | Pipeline built, checked and promoted it automatically (run `38990238610`); published tag `2.4.0-r415482841`, manifest digest `sha256:ba91239d711b9ed0184a65de4a228cb7857ce1003b476d1092cf9689e85e29c8`. Both strict patches apply to the 2.4.0 bundle with `--fuzz=0`. Top-level bundle layout unchanged from 2.3.1. No repository change |
| Canvas `@openchamber/sdk` | `2.2.0` | 2.4.0 | `packages/sdk` diff 2.2.0..2.4.0 (`contract.ts`, `API.md`, `GUEST_SERVICES.md`, `ui/`) | Additive only: new `GUEST_UI_LOOK_CSS` export, `GUEST_REQUEST_RESPONSE_MAX` raised to 8 MB, new `REQUEST_FAILED` / `RESPONSE_TOO_LARGE` codes, restyled UI kit. No breaking API for the panel's `connectHost` / `applyHostReady` / `applyHostTheme` / `parseManifest` use. Dependabot-owned bumps |
| Canvas other Bun packages | lockfile | esbuild 0.28.2, mermaid 12.1.0, react 19.3.0, zod 4.6.5, `@json-render/*` 0.21.0 | npm dist-tags; mermaid 12.2.0 release notes | mermaid 12.2.0 is one opt-in mindmap option plus patch fixes; `@json-render/*` 0.21.1 and zod 4.6.7 are patches. No semantic breakage found. Dependabot PRs #6–#10 have green Canvas and documentation CI. Left to Dependabot |
| Browser Bun packages | `ws` 8.22.0, esbuild 0.28.2 | current | npm dist-tags | No open Dependabot PR; nothing newer with a security driver |
| Browser Chromium and fonts | apt resolution from `debian:bookworm-slim` | built image 2026-10-15 carries Chromium 155.0.8059.39; `bookworm-security` now offers 155.0.8059.79-1~deb12u1 | Debian `bookworm` and `bookworm-security` package lists | Mutable by design. The weekly browser rebuild (Monday 04:37 UTC) adopts it without a repository change. Refresh latency is up to a week plus the schedule's own delay |
| Browser runtime closure | apt resolution | `ca-certificates` 20250419~deb12u1, `libnss3` 3.87.1-1+deb12u4, `fonts-inter` 4.0~beta7+ds-1, `fonts-jetbrains-mono` 2.242+ds-3, `fonts-noto-color-emoji` 2.042-0+deb12u1 | Build log of the 2026-10-15 image, compared against the current `bookworm` and `bookworm-security` lists | All current; the security suite is active in the build, so certificates already resolve to the security version. The image records the resolved set in `browser-build.json` |
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
- Chromium update pick-up by the next weekly browser rebuild, which publishes through automation rather than this repository's edits. Scheduled runs are not punctual on this repository: the 2026-10-12 weekly window produced schedule runs at 12:08 and 12:21 UTC instead of 04:23 and 04:37, so the nominal cron time is a floor, not the expected minute. The 2026-10-19 window had not fired when this run ended

## Run 2026-10-13

Recorded in memory by that run and reconciled here; the versions it inherited were not re-verified. It reviewed upstream 2.3.1, Bun 1.4.2 → 1.4.3, pnpm 11.1.2 → 11.28.5, `@fission-ai/openspec` 1.14.1, uv 0.13.0, Node 22.23.3, go1.25.14, Rembric plugin v0.34.0 against server 0.29.4, Canvas `@openchamber/sdk` 2.2.0 and the Bun lockfiles. It re-vendored the Rembric core and merged the sandbox pin changes in `a76453a`. Dependabot had no open pull requests. No repository-owned state file existed before the 2026-10-19 run; its evidence is the change folder, the [change history](changes/history.md) entry and this record.
