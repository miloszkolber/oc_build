# Evidence

## Discovery

Scheduled Build workflows `42523669913` and `42542443670` failed discovery with `Expected v-prefixed release tag`. Upstream's rolling `asr-models` release (`prerelease: true`) has no `v` prefix and no web tarball. Discovery now skips any prerelease without a `v`-prefixed tag; malformed stable tags and malformed `v`-prefixed prereleases still fail. Regression coverage includes `canary`, `asr-models`, a stable `2.6.0`, and `2.7.0-beta.1`. The 43 release/latest/entrypoint tests pass.

## App 2.7.0

Already published before the failure: `latest` resolves to `sha256:c2b45aaf…` and the running app reports 2.7.0. Asset SHA-256 matched GitHub (`4eff3cfb…`); both strict patches apply with zero fuzz. Dependency delta from 2.6.1: SDK 2.7.0, `@opencode/client`/`schema` 2.2.6 (host OpenCode is 2.2.6), node-pty and simple-git unchanged. SDK additions (extension services/opencode plugin) have no local consumer; MCP fixes do not affect the sandbox CLI. The upcoming rebuild refreshes mutable Debian/Node bases.

## Sandbox

Rebuilt with uv 0.13.7, pnpm 11.28.11 and OpenSpec 1.16.1; the build-time check passed as UID 1000 offline, including Obscura fetch/screenshot and the `browser` CLI. Inventory:

```
bun 1.4.4
go go1.27.3
node v22.23.4
npm 10.9.9
pnpm 11.28.11
python3 3.11.2
uv 0.13.7
openspec 1.16.1
obscura 0.2.6
playwright-core 1.65.0
```

Documentation checks, nine checker tests and strict validation pass under OpenSpec 1.16.1. Publication, rollout and digests are recorded after CI.
