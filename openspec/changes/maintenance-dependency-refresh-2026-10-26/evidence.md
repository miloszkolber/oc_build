# Evidence

Executed 2026-10-26 on the host Docker runtime. Development commands ran in the rebuilt workspace sandbox image. Values are the command results, not expectations.

## App image patch

Reproduction against the unmodified bundle, before the fix:

```
$ patch --batch --forward --fuzz=0 -p1 --dry-run < docker/openchamber/home-repository.patch
checking file server/lib/git/service.js
Hunk #1 FAILED at 2519.
1 out of 1 hunk FAILED
```

After rewriting `home-repository.patch` against the 2.5.2 `probeRepository`:

```
$ patch --batch --forward --fuzz=0 -p1 < self-update.patch
patching file server/lib/opencode/openchamber-routes.js
Hunk #1 succeeded at 119 (offset 26 lines).
Hunk #2 succeeded at 195 (offset 30 lines).
$ patch --batch --forward --fuzz=0 -p1 < home-repository.patch
patching file server/lib/git/service.js
```

Build and check of the real image:

```
$ docker build -t openchamber:check-252 \
    --build-arg OPENCHAMBER_VERSION=2.5.2 \
    --build-arg OPENCHAMBER_ASSET_SHA256=e4039e96a3d1b0990d88c85b91836943bc023bf6a5f2935ad7646001f116abee \
    docker/openchamber
exit 0
$ docker run --rm --interactive --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --tmpfs /tmp:exec,size=512m,mode=1777 --shm-size=512m \
    --env EXPECTED_VERSION=2.5.2 --entrypoint node openchamber:check-252 \
    --input-type=module < docker/openchamber/check-image.mjs
App image passed: upstream web app, Git/shell, no Chromium or archived extension
```

The check covers the home-root opt-in, the unset and mismatched cases, the filesystem-root rejection, the VCS-init refusals, Git worktrees, the PTY, and `node --check` over the shipped server.

## Sandbox image

```
$ docker build -t openchamber-sandbox:check-2610 docker/sandbox
exit 0   # build-time check-image.sh reports "sandbox image check OK"
$ docker run --rm --network none --entrypoint cat openchamber-sandbox:check-2610 \
    /usr/local/share/sandbox/sandbox-build.txt
bun 1.4.4
go go1.25.14
node v22.23.4
npm 10.9.9
pnpm 11.28.8
python3 3.11.2
uv 0.13.5
openspec 1.15.0
```

Documentation contracts in the same image:

```
$ bun test scripts/check-docs.test.mjs
9 pass, 0 fail
$ bun scripts/check-docs.mjs
23 Markdown files checked, 0 failures
$ openspec validate --all --strict
Totals: 7 passed, 0 failed (7 items)
```

## App and plugin contracts

```
$ bun test docker/openchamber/releases.test.mjs docker/openchamber/latest.test.mjs docker/openchamber/entrypoint.test.mjs
42 pass, 0 fail
$ bun build ./index.ts --target bun --format esm --outfile dist/rembric.js   # extensions/rembric
Bundled 3 modules in 9ms
rembric.js  22.28 KB  (entry point)
$ bun -e 'import("./dist/rembric.js") ...'
Rembric bundle export OK rembric.lifecycle
```

## Canvas

```
$ bun install --frozen-lockfile
$ bun test
59 pass, 0 fail
$ bun run package
dist/openchamber-generative-canvas-0.9.17.zip 118 files
$ bun scripts/validate.mjs dist/examples/*.canvas.json
Valid catalog-1 canvas: Self-hosting cost explorer
Valid catalog-1 canvas: Component gallery
```

## Browser image

Rebuilt with the browser Dockerfile (Bun 1.4.4 build stage) and checked under the publication flags:

```
$ docker build -t openchamber-browser:check-2610 docker/browser
exit 0
$ docker run --rm --interactive --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --tmpfs /tmp:exec,size=512m,mode=1777 --shm-size=512m \
    --entrypoint node openchamber-browser:check-2610 \
    --input-type=module < docker/browser/check-image.mjs
Standalone browser image passed: Chromium 156.0.8078.47, 38 MCP tools, responsive layout/color preference/navigation/screenshot/auth/policy; no extension or surface API
```

Chromium resolved from `bookworm-security` to the current 156.0.8078.47, ahead of the next weekly rebuild.

## Not executed

- App image startup against a real OpenCode server. The entrypoint regression and the image check do not run the server; the deployed 2.5.1 container is the observed live evidence.
- Node 24 runtime-line build. Evidence lives on the held branch, not here.
- Live Rembric lifecycle against the running server.
