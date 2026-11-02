# Evidence

- [Upstream commit 6078a6b](https://github.com/susomejias/rembric/commit/6078a6b768f9bc1656c1d32b456bb05422c2b7c2) adds a default V2 export with prompt, context and tool hooks and an event subscription in `apps/plugin/.opencode-plugin/plugin.ts`. It was released in plugin v0.36.0.
- At plugin v0.39.0, `apps/plugin/bin/rembric-plugin-core.mjs` SHA-256 is `481a1d6ec8a3482d877dbe8112924252061f6ec4ede7d10da5e41bb559267704` and `apps/plugin/mcp-bridge/rembric-dotenv.mjs` is `639bf8c45800f44dbd2fcef99f5a7f280f710182dd100e86c0fba953f284bb7b`. Both match the local vendored files byte-for-byte.
- Local `extensions/rembric/index.ts` also registers prompt, context and tool hooks and subscribes to events. Shared hook names are not proof of equivalent behavior.
- Existing production plugin registration was observed active in the preceding run. Injection, turn reporting, flush and installed bundle provenance were not established.
- Upstream server v0.30.4 changed conversational-activity summary nudges in [commit c7d44bd](https://github.com/susomejias/rembric/commit/c7d44bd7defe456e7cb83e84ab28c3fc4daca64b). Consumer impact remains to be assessed.

## Comparison and closure, 2026-11-02

Both implementations register `prompt`, `context` and `execute.before` hooks and subscribe to the server event stream. They cache injected context per session and re-push it per request. The local adapter filters events to its own directory and skips sub-agents, as upstream does. The local shutdown handler listens for `global.disposed`; upstream listens for `server.instance.disposed`. The deployed plugin logged `[rembric] dispose-flush` three times since 2026-11-01, so the local event fires in the running OpenCode version.

The [`build/plugins`](https://opencode.ai/v2/docs/build/plugins) overview confirms the default `{ id, setup }` server part and hook-based context. It does not enumerate shutdown event names, so this comparison relies on the local source, the upstream commit and observed behaviour.

Live evidence from the deployed pair: `[rembric] loaded for OpenCode 2.2.5` on startup, sessions recorded in Rembric with summaries, and dispose-flush log lines. Recall injection was not observed directly; it is an access-limited acceptance check, not a passing result.

Decision: retain the local adapter and correct its stale documentation. No dependency, host plugin install or protocol change is made.
