# Evidence

Maintenance run date: 2026-10-19. Environment: host Docker 29.1.3; development checks run in the workspace sandbox image, rebuilt locally from the edited `docker/sandbox/Dockerfile` as `openchamber-sandbox:check-1019`.

## Reviewed dependencies and newest version seen

| Component | Pinned in repo | Newest reviewed | Verdict |
| --- | --- | --- | --- |
| Upstream OpenChamber release | `latest` (resolved at build) | 2.4.0 (2026-10-17, release `415482841`) | Pipeline already built and promoted it (run `38990238610`); no action |
| Canvas `@openchamber/sdk` | 2.2.0 | 2.4.0 | Additive API only; Dependabot-owned |
| Canvas other Bun packages | lockfile | esbuild 0.28.2, mermaid 12.2.0, react 19.3.0/19.3.1, zod 4.6.7, `@json-render/*` 0.21.1 | mermaid 12.2.0 adds one opt-in option plus patch fixes; the rest are patches. No semantic breakage. Dependabot-owned |
| Browser Bun packages | `ws` 8.22.0, esbuild 0.28.2 | current | No action |
| Bun base image | 1.4.3 | 1.4.3 | Current |
| Node 22 / distroless nodejs22 | mutable tags | 22.23.3; distroless `latest` = `sha256:8a3e96fe…f3f5bc` | Mutable; resolved at build |
| Go base | `golang:1.25-bookworm` | go1.25.14 is the last 1.25 patch; supported lines are 1.26.9 and 1.27.2 | Held for operator input; see the branch below |
| Debian bookworm / Chromium | mutable tags | Chromium 155.0.8059.79-1~deb12u1 now in `bookworm-security`; the published image carries 155.0.8059.39 | Weekly rebuild adopts it; no repository change |
| uv | 0.13.0 | 0.13.1 | Bumped (patch fixes only) |
| pnpm | 11.28.5 | 11.28.6 | Bumped (security fix + regression repair) |
| `@fission-ai/openspec` | 1.14.1 | 1.14.3 | Bumped (drops the `braces` advisory chain; fixes a `validate --all` hang) |
| Rembric vendored core | plugin v0.34.0 bytes | plugin v0.34.1 | Byte-identical; nothing to re-vendor |
| GitHub Actions | SHA-pinned | current | Dependabot-owned |

Dependabot open pull requests at run time: #6–#10, all `extensions/canvas` Bun bumps (`@json-render/core` 0.21.1, `@json-render/react` 0.21.1, mermaid 12.2.0, `@openchamber/sdk` 2.3.2, zod 4.6.7). All carry green Canvas and documentation CI. No semantic breakage found; no competing branch created.

## Upstream sources read

- `openchamber/openchamber`: v2.4.0 release asset list and body, plus v2.3.2 and v2.3.3 for the intervening lines; `git diff v2.2.0 v2.4.0` over `packages/sdk` (`contract.ts`, `API.md`, `GUEST_SERVICES.md`, `ui/style.ts`, `ui/index.ts`, `package.json`).
- Bundle contents: `openchamber-web-2.3.1.tgz` and `openchamber-web-2.4.0.tgz` top-level layout and per-directory file counts.
- `susomejias/rembric`: `plugin-v0.34.1` release notes and the two vendored files fetched from that tag.
- `oven-sh/bun`: release and tag lists. `nodejs/node`: 22.x releases. `astral-sh/uv`: 0.13.1 release notes. `pnpm/pnpm`: v11.28.6 release notes. `Fission-AI/OpenSpec`: changelog for 1.14.2 and 1.14.3 plus npm dependency manifests for 1.14.1/1.14.3. `mermaid-js/mermaid`: 12.2.0 release notes.
- `go.dev/dl` version feed, Go release notes for 1.26.9/1.27.1/1.27.2, and the OSV `stdlib` query API.
- Debian `bookworm`, `bookworm-updates` and `bookworm-security` package lists for Chromium, fonts and `ca-certificates`; Docker Hub and registry tag metadata for every base image digest recorded in [maintenance-state.md](../../maintenance-state.md).

## Executed checks

- Sandbox image built from the edited Dockerfile; the build's own `RUN --network=none bash check-image.sh` printed `sandbox image check OK`. Recorded inventory: bun 1.4.3, go1.25.14, node v22.23.3, npm 10.9.9, pnpm 11.28.6, python3 3.11.2, uv 0.13.1, openspec 1.14.3.
- `bash /usr/local/share/sandbox/check-image.sh` in the rebuilt image — `sandbox image check OK`.
- `bun scripts/check-docs.mjs` — `26 Markdown files checked, 0 failures` before the archive consolidation, `23 Markdown files checked, 0 failures` after.
- `bun test scripts/check-docs.test.mjs` — `9 pass, 0 fail`.
- `openspec validate --all --strict` with the bumped 1.14.3 — `8 passed, 0 failed (8 items)` before archiving, `7 passed, 0 failed` after. The stricter 1.14.2 warnings do not fail the current specs.
- `bun test docker/openchamber/releases.test.mjs docker/openchamber/latest.test.mjs docker/openchamber/entrypoint.test.mjs` — `42 pass, 0 fail`.
- Rembric bundle: `bun build ./index.ts --target bun --format esm` plus import check — `plugin export OK: rembric.lifecycle function`, 22.28 KB. Vendored hashes unchanged (`481a1d6e…267704`, `639bf8c4…4bb7b`).
- Drift assertion: the edited `check-image.sh` run against the published `ghcr.io/miloszkolber/openchamber-sandbox:latest` printed `sandbox image check FAILED: OpenSpec version` and exited 1; run against the rebuilt image it passed.
- App bundle integration: `patch --batch --forward --fuzz=0 -p1 --dry-run` for `self-update.patch` and `home-repository.patch` against the extracted 2.4.0 bundle — both `APPLIES`. The 2.4.0 bundle's top-level entries are `bin`, `dist`, `package.json`, `public`, `README.md`, `server`, the same set as 2.3.1, so the image's `COPY` list is still complete.
- Archive: `openspec archive maintenance-dependency-refresh --skip-specs` reported the tracked tasks complete and archived it; the consolidated entry was added to the change history and the archive directory removed.

## Not verified

- Browser image was not rebuilt locally; its Chromium refresh is CI's weekly job and its Bun pin is unchanged this run.
- Canvas was not reinstalled or re-tested here: it is maintained in this repository but not installed on this host, and no Canvas source changed. Its Dependabot pull requests carry green Canvas CI.
- Rembric live lifecycle (registration, recall, reporting) still requires a running OpenCode/Rembric pair; only the bundle contract was checked.
- The Go toolchain line change was built and checked on its own held branch and is not merged; the merged work changes nothing a consumer repository builds with.
