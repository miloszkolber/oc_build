# Rembric OpenCode V2 plugin

Maps [Rembric](https://github.com/susomejias/rembric)'s harness-agnostic session protocol onto OpenCode's **V2** plugin API: OpenCode sessions are registered, reported and summarised in Rembric, and Rembric's memory nudges reach the model.

## This is an OpenCode plugin, not an OpenChamber extension

This package is an **OpenCode V2 plugin**. It lives at `extensions/rembric/` only because both packages are built from this repository; sharing the `extensions/` directory is not a runtime relationship.

- OpenCode loads it from its own plugin directory and it never appears in OpenChamber's extension list.
- OpenChamber's extension install and service-approval flow does not apply to it.
- The standalone [`../../docker/browser/`](../../docker/browser/README.md) package is a separate browser MCP, not an OpenCode plugin or OpenChamber guest extension.

Upstream Rembric ships an OpenCode plugin written against the **V1** API (`export const RembricPlugin = async (ctx) => ({ config, event, 'chat.message' })`), which OpenCode 2.x does not load. This is an independently written V2 entry point that keeps upstream's vendored session protocol and maps it onto the V2 hook surface.

## What it does

- Registers and resumes each session with the Rembric server.
- Pushes transient system text into every model request: first-prompt and recall nudges plus daemon-supplied recall hints. It is injected through the `context` hook, never appended to the user's persisted turn.
- Captures the assistant transcript from the V2 `session.text.ended` stream, accumulated by ordinal, so turn reports and summaries carry both sides.
- Reports turns on `session.idle` and `session.execution.succeeded`, flushes summaries on an idle debounce and after `session.compaction.ended`, and flushes all known sessions fire-and-forget on `global.disposed`.
- Scopes events to this plugin instance's directory and ignores sub-agent sessions.

Behaviour that follows from the V2 API is documented in the header comment of `index.ts`.

## Layout

| Path | Purpose |
| --- | --- |
| `index.ts` | V2 entry point, independently written against OpenCode's documented V2 plugin API |
| `core/rembric-plugin-core.mjs` | vendored **unmodified** from Rembric (`apps/plugin/bin/rembric-plugin-core.mjs`) |
| `core/rembric-dotenv.mjs` | vendored **unmodified** from Rembric (`apps/plugin/mcp-bridge/rembric-dotenv.mjs`) |
| `install.sh` | builds the bundle and copies it with `NOTICE` into OpenCode's plugin directory |
| `package.json` | build and deploy scripts; no dependencies (the bundle is self-contained) |
| `NOTICE` | upstream attribution and licence |
| `dist/` | generated build output; git-ignored and never committed |

Do not edit `core/`. Both files are byte-for-byte upstream and are covered by Rembric's MIT licence; see [NOTICE](NOTICE).

## Build

```sh
bun run build
```

which runs exactly the command in the workflow:

```sh
bun build ./index.ts --target bun --format esm --outfile dist/rembric.js
```

The default export is a plain `{ id, setup }` object, so the bundle inlines both vendored files and has no runtime dependencies. Output is `dist/rembric.js` (about 22 KB).

## Install

```sh
bun run deploy      # or: sh install.sh
```

`install.sh` builds, then copies the bundle and its notice into OpenCode's global plugin directory:

```sh
sh install.sh [plugin-dir]   # default: ${XDG_CONFIG_HOME:-$HOME/.config}/opencode/plugins
```

On this host the deployed files are:

- `/home/core/.config/opencode/plugins/rembric.js`
- `/home/core/.config/opencode/plugins/rembric.NOTICE`

OpenCode discovers `*.js` files directly under the plugin directory and reloads on change, so no `opencode.jsonc` plugin entry is needed. The Rembric MCP server is configured separately, pointing at the `/mcp` endpoint of the same origin:

```json
{
  "mcp": {
    "rembric": {
      "type": "remote",
      "url": "https://core.mewa.sh:8787/mcp",
      "oauth": false,
      "headers": { "Authorization": "Bearer {file:/etc/opencode-server/rembric.token}" }
    }
  }
}
```

## Configuration

| Variable | Meaning |
| --- | --- |
| `REMBRIC_SERVER_URL` | Rembric origin, no `/mcp` suffix. Default `https://core.mewa.sh:8787` |
| `REMBRIC_API_TOKEN` | Bearer token. Without it the plugin loads but stays disabled and logs why |
| `REMBRIC_PROJECT_SLUG` | Fallback project slug; a `.rembric` file in the session directory wins |
| `REMBRIC_INJECT_ALWAYS` | `1` rebuilds the injected context every turn instead of caching it per session |
| `REMBRIC_IDLE_DEBOUNCE_MS` | Idle-summary debounce in milliseconds, default `500` |

A `.rembric` file is dotenv-style and read from the session's working directory:

```
PROJECT_SLUG=my-project
```

The variables reach the OpenCode service through `EnvironmentFile=/etc/opencode-server/rembric.env`. A missing server URL or token never fails a session: the plugin disables its hooks and writes a `[rembric]` line to stderr.

## Verification

Build-time contract, also the `plugin` job of `.github/workflows/build.yml`, run from this directory:

```sh
bun build ./index.ts --target bun --format esm --outfile dist/rembric.js
bun -e 'const {default:p}=await import("./dist/rembric.js"); if(p.id!=="rembric.lifecycle" || typeof p.setup!=="function") throw new Error("Invalid bundled plugin export")'
cp NOTICE dist/
(cd dist && sha256sum rembric.js > SHA256SUMS)
```

The same job also writes `dist/build.json` with the recorded OpenCode API version (`2.0.24`), the bun version and the bundle SHA-256. At runtime, `rembric.lifecycle` should be `active` under `GET /api/plugin`; the plugin was last load-verified against OpenCode 2.0.24 with Rembric 0.28.17.

## Rollback

The deployed plugin is one file plus its notice, so rollback is a file swap:

1. Before deploying, back up the current pair: `cp ~/.config/opencode/plugins/rembric.js ~/.config/opencode/plugins/rembric.js.bak` (and the same for `rembric.NOTICE`).
2. To revert, restore the backup, or delete `rembric.js` and reload/restart OpenCode to remove the plugin entirely.
3. To rebuild an earlier revision: `git checkout <ref> -- extensions/rembric && (cd extensions/rembric && bun run build) && sh install.sh`.
4. To disable without removing the file, unset `REMBRIC_API_TOKEN` (or the `EnvironmentFile`): the plugin loads but stays disabled.

`dist/` is generated and git-ignored, so rebuild from the committed source at the desired revision; do not roll back by editing `dist/`.

Upstream warns that its server and plugin APIs can change together, so re-check the protocol after upgrading either side.
