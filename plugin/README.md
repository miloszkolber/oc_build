# Rembric OpenCode V2 plugin

Maps [Rembric](https://github.com/susomejias/rembric)'s session protocol onto the OpenCode **V2** plugin API.

## Why this exists

Upstream ships an opencode plugin written against the **V1** plugin API:

```ts
export const RembricPlugin: Plugin = async (ctx) => ({ config, event, 'chat.message', … })
```

OpenCode 2.x loads `Plugin.define({ id, setup })` instead, so the upstream plugin never registers. This directory keeps upstream's harness-agnostic session protocol verbatim (`core/`, vendored unmodified under its MIT licence) and adds a thin V2 adapter.

## Differences from the upstream plugin

- **No `config` hook.** V2 sets MCP servers in `opencode.jsonc`, so this adapter does not inject one. Point OpenCode at Rembric directly.
- **Nudges are transient.** Upstream appended nudge text to the user message parts, which makes it part of the user's own turn. Here they are pushed into the model request's system context via `ctx.session.hook("context", …)`, so they reach the model without being persisted as user text.
- **Terminal events.** Closure uses V2's `session.execution.succeeded` alongside the deprecated `session.idle`.

## Configuration

| Variable | Meaning |
| --- | --- |
| `REMBRIC_SERVER_URL` | Rembric origin, no `/mcp` suffix. Default `http://127.0.0.1:8787` |
| `REMBRIC_API_TOKEN` | Bearer token. Without it, hooks stay disabled and the plugin logs why |
| `REMBRIC_PROJECT_SLUG` | Fallback project slug; a `.rembric` file in the working directory wins |

Both variables are supplied to the OpenCode service through `EnvironmentFile=/etc/opencode-server/rembric.env`. If they are missing the plugin loads but disables itself — it never fails the session.

## Verified

- Loads as `rembric.lifecycle` with state `active` on OpenCode 2.0.23.
- The vendored protocol completes against Rembric 0.28.17: session ensure, turn report, summary, and end all succeed, and the session appears in the dashboard.

Upstream warns that server and plugin APIs can change together, so re-check the protocol after either side is upgraded.
