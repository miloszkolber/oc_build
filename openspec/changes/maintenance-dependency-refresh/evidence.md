# Evidence

Maintenance run date: 2026-10-13. Environment: host Docker 29.1.3, checks run in
the workspace sandbox image (`ghcr.io/miloszkolber/openchamber-sandbox:latest`,
built 2026-10-12) and locally rebuilt images.

## Reviewed dependencies and newest version seen

| Component | Pinned in repo | Newest reviewed | Verdict |
| --- | --- | --- | --- |
| Upstream OpenChamber release | `latest` (resolved at build) | 2.3.1 (2026-10-13) | Pipeline already built/promoted 2.3.1; no action |
| Bun base image | 1.4.2 | 1.4.3 (2026-10-10) | Bumped (CVE-2026-48618, CVE-2023-44487, CVE-2025-8671) |
| pnpm | 11.1.2 | 11.28.5 (11.x line) | Bumped (13 advisories) |
| `@fission-ai/openspec` | 1.14.1 | 1.14.1 | Current |
| uv | 0.13.0 | 0.13.0 | Current |
| Node 22 base / distroless nodejs22 | mutable tags | 22.23.3 | Mutable; weekly rebuild refreshes |
| Go base | 1.25-bookworm (mutable) | go1.25.14 | Mutable; rebuild refreshes |
| Debian bookworm / chromium | mutable tags | current | Mutable; weekly rebuild refreshes |
| Rembric vendored core | pre-v0.34.0 | plugin v0.34.0 | Re-vendored |
| Canvas `@openchamber/sdk` | 2.2.0 | 2.3.1 | API unchanged; Dependabot-owned |
| Canvas/browser Bun packages | lockfiles | current | Dependabot-owned |
| GitHub Actions | SHA-pinned | current | Dependabot-owned |

Dependabot open PRs at run time: none.

## Executed checks

- `bun scripts/check-docs.mjs` — `22 Markdown files checked, 0 failures`.
- `bun test scripts/check-docs.test.mjs` — `9 pass, 0 fail`.
- `openspec validate --all --strict` — `7 passed, 0 failed`, including
  `change/maintenance-dependency-refresh` with the `skip_specs` INFO note.
- Rembric bundle: `bun build ./index.ts --target bun --format esm` plus import
  check — `plugin export OK: rembric.lifecycle setup: function` (22.28 KB).
- Sandbox image rebuilt from the edited Dockerfile — build ran
  `check-image.sh` with network off and printed `sandbox image check OK`
  (bun 1.4.3, pnpm 11.28.5, node v22.23.3, go1.25.14, uv 0.13.0).
- Drift assertion: the edited `check-image.sh` run against the previous
  published sandbox image (pnpm 11.1.2) printed
  `sandbox image check FAILED: pnpm version`; run against the rebuilt image it
  printed `sandbox image check OK`.
- App image `tools` stage rebuilt (`docker build --target tools`), which runs
  the entrypoint regression with the copied Bun 1.4.3; `bun --version` in the
  result reports `1.4.3`.

## Upstream sources read

- `openchamber/openchamber` releases through v2.3.1 (release bodies and assets).
- Rembric `susomejias/rembric`: `plugin-v0.34.0` release notes (breaking
  `memory.*_batch` change) and `plugin-v0.33.2` (recall-hints budget).
- `oven-sh/bun` v1.4.3 release notes and blog (security section).
- OSV advisories for every pinned npm package (pnpm 11.1.2 returned 13
  GHSA IDs; the other pinned packages were clean) and the pnpm 11.28.5/12.11.2
  clean re-query.
- npm registry dist-tags for npm, pnpm, esbuild, ws, mermaid, react, react-dom,
  zod, `@json-render/*`, `@openchamber/sdk`, fflate, `@fission-ai/openspec`.

## Not verified

- Browser image was not rebuilt locally (apt Chromium closure is heavy); the
  Bun bump there is the same patch line already exercised by the app tools
  stage and by CI setup-bun 1.4.3. CI build.yml/browser.yml cover it on merge.
- Rembric live lifecycle (registration, recall, reporting) was not exercised
  against a running OpenCode/Rembric pair; only the bundle contract was checked.
