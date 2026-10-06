# Signet OpenCode plugin

Source-loaded OpenCode V2 lifecycle plugin that connects OpenCode to a Signet daemon. Ported from Signet `0.226.27` (Apache-2.0; see `LICENSE` and `NOTICE`).

Registered from `/repo/openchamber/plugin` by the global OpenCode config. OpenCode watches the source and hot-reloads it; a dependency change still needs a restart.

## Behavior

- Restores `session-start`, `user-prompt-submit`, notification refresh, `pre-compaction`, `skill-invocation` and `compaction-complete`, using the documented V2 hook, tool-hook and event APIs.
- Injects memory, clock and compaction context into model-request draft parts only. Injections are recorded so repeated or cloned drafts are replaced without deleting user-authored text.
- On a finished execution, submits a transcript checkpoint. On real deletion, sends `session-end` with `reason: "session.deleted"`.
- Shutdown interruption is preserved as resumable work rather than reported as completion.
- Daemon failure or timeout never blocks prompt admission.

A `{ skipped: true }` checkpoint response is not a persistence or extraction receipt; real memory extraction is not verified by this plugin.

## Limitations

- **No final-output sanitization.** OpenCode V2 has no provider-independent assistant-text-complete hook. Injected Signet context is labelled private and untrusted and the model is asked not to repeat it, but that is defense-in-depth, not a guarantee. Do not rely on this plugin where final-response disclosure matters.
- Transcript checkpoints need the session directory to match the plugin location and the OpenCode history API to be reachable; otherwise the transcript is omitted rather than submitted partially.

## Configuration

| Setting | Purpose |
| --- | --- |
| `openCodeApiBaseUrl` (option) | OpenCode API base; defaults to `http://127.0.0.1:4096` |
| `OPENCODE_SERVER_PASSWORD`, `OPENCODE_SERVER_USERNAME` | Basic auth for history reads; read from the process environment only |
| `SIGNET_OPENCODE_API_TRUSTED_ORIGIN` | Required exact HTTPS origin before any non-loopback API access |
| `SIGNET_ENABLED=false`, `SIGNET_NO_HOOKS=1` | Disable the hooks; the remote Signet MCP stays available |
| `SIGNET_DAEMON_URL`, `SIGNET_AGENT_ID`, `SIGNET_PATH` | Daemon location, agent identity, static identity fallback |

Plain HTTP is allowed only for loopback. Redirects are rejected so credentials are never forwarded.

## Build and test

```sh
test -s bun.lock && bun install --frozen-lockfile && bun run test && bun run build
```

The frozen suite has 48 tests / 504 assertions and uses synthetic fixtures; it does not contact the real Signet or OpenCode services. `bun run build` writes `dist/signet-opencode.mjs` with `@opencode/plugin` external. The bundle includes `yaml@2.6.0` (ISC, `yaml-licence.txt`). `package.json` keeps `main: ./index.ts`, so building does not switch host registration to the bundle.
