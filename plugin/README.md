# Rembric OpenCode V2 plugin

Maps [Rembric](https://github.com/susomejias/rembric)'s session protocol onto the OpenCode **V2** plugin API.

## Why this exists

Upstream ships an opencode plugin written against the **V1** plugin API:

```ts
export const RembricPlugin: Plugin = async (ctx) => ({ config, event, 'chat.message', … })
```

OpenCode 2.x loads a default-exported `{ id, setup }` plugin instead, so the upstream V1 entry never registers. This directory keeps upstream's harness-agnostic session protocol verbatim (`core/`, vendored unmodified under its MIT licence) and adds a V2 entry point.

## Differences from the upstream plugin

- **No `config` hook.** V2 sets MCP servers in `opencode.jsonc`, so this plugin does not inject one. Point OpenCode at Rembric directly.
- **No `@opencode/plugin` import.** The V2 entry is a plain `{ id, setup }` object, matching upstream Rembric, so the built bundle has no runtime dependency and installs as a single file.
- **Nudges are transient.** Upstream appended nudge text to the user message parts, which makes it part of the user's own turn. Here they are pushed into the model request's system context via `ctx.session.hook("context", …)`, so they reach the model without being persisted as user text.
- **Transcript capture follows the V2 stream.** Assistant text arrives as `session.text.ended` (not message parts) and is accumulated by ordinal before `core.upsertAssistantMessage`, so turn reports and summaries carry the assistant side.
- **Terminal events.** Closure uses V2's `session.execution.succeeded` alongside the deprecated `session.idle`; `global.disposed` flushes summaries fire-and-forget.

## Build and install

```sh
sh install.sh            # → ~/.config/opencode/plugins/rembric.js (+ rembric.NOTICE)
```

OpenCode discovers `*.js` files directly under `~/.config/opencode/plugins/` and reloads on change. `bun run build` writes the same bundle to `dist/rembric.js`; `bun run deploy` is `install.sh`.

## Configuration

| Variable | Meaning |
| --- | --- |
| `REMBRIC_SERVER_URL` | Rembric origin, no `/mcp` suffix. Default `http://127.0.0.1:8787` |
| `REMBRIC_API_TOKEN` | Bearer token. Without it, hooks stay disabled and the plugin logs why |
| `REMBRIC_PROJECT_SLUG` | Fallback project slug; a `.rembric` file in the working directory wins |
| `REMBRIC_INJECT_ALWAYS` | `1` rebuilds the injected context every turn instead of caching it per session |

The variables reach the OpenCode service through `EnvironmentFile=/etc/opencode-server/rembric.env`. If they are missing the plugin loads but disables itself — it never fails the session.

## Verified

- Loads as `rembric.lifecycle` with state `active` on OpenCode 2.0.24 (`GET /api/plugin`).
- The vendored protocol completes against Rembric 0.28.17: session ensure, turn report, summary, and end all succeed, and the session appears in the dashboard.

Upstream warns that server and plugin APIs can change together, so re-check the protocol after either side is upgraded.
