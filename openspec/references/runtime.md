# Host integration and reliability

This is integration context, not a specification for code implemented here.
The host repository owns effective settings and deployment. Reverify settings
against it before a rollout. Historical observations below are not a claim
about the newest upstream release.

## External OpenCode paths

Containerized OpenChamber and native OpenCode must see workspace paths at the
same absolute location. Core uses `/data/.db/openchamber` for state,
`/data/.db/openchamber/chats` for managed Chats, and `/home/core` for home.
The `/repo` and `/home/core` mounts remain important. Managed worktrees must use
shared durable XDG data, not a container-only temporary directory.

A healthy app and successful container-local file operation do not prove native
workspace bootstrap. Check `/api/fs/home`, then location/config/form/permission
bootstrap at the returned root. Create/read/delete only an owned probe session.
Inspect the client warning and preserve authored data. A `LocationNotFoundError`
does not justify recursive ownership or permission changes.

Native Web/control flags and `browserProvider=builtin` concern app integration.
Managed-child plugin injection must not be assumed to reach external OpenCode.
Inspect its actual advertised interfaces before adding integration. Framework
toolchains, speech models and service credentials retain their own owners.
The sandbox branch supplies build tooling, not the browser MCP.

## Search projection blocker

Observed with **OpenCode 2.0.26**: historical assistant message reads stalled at
page sizes 100 and 10. Single-record paging passed ordinary records and then
stalled on an oversized record. Logs included
`Cannot create a string longer than 0x1fffffe8 characters` and transport termination.
This is record serialization/transport evidence, not a SQLite-permission diagnosis.

OpenChamber's indexer discards tool output, but the native API serialized complete
records first. The inspected API offered type/limit/order/cursor, not content
projection. Sanitized export also redacted searchable text. Core kept
`messageSearchEnabled=false`, preserving sessions and the index database.
Investigation artifacts were under `/tmp/opencode/openchamber-reliability/` and
may no longer exist. Source history and the host runbook retain the incident context.

| Re-enable condition | Required evidence |
| --- | --- |
| Supported bounded projection | User and assistant text/reasoning selected **before serialization**, excluding tool/provider state without losing searchable text. No writable ad-hoc DB adapter |
| Regression | Large tool state with ordinary text no longer overflows. Order/cursors and known user/assistant phrase retrieval work |
| Safe rollout | Consistent native-data backup, preserved sessions/index, authorized idle window for restart, migration-aware recovery |
| Acceptance | Backfill and live indexing finish without skips/placeholders. Expected snippets/session IDs are returned and ordinary APIs/realtime remain stable |

Record tested versions and results before enabling indexing. Deleting history,
indexing sanitized placeholders, blindly raising memory limits or shrinking page
size alone are not repairs. Image rollback does not reverse data migrations.

## Evidence and security boundaries

- Report browser checks as **MCP Chromium**, not native desktop acceptance.
- Keep browser mounts separate from home/workspace/credentials and Docker sockets.
- Preserve bearer authentication, destination grants and temporary-profile idle
  expiry (30 minutes by default, not a fixed login lifetime). Sandbox exceptions
  require explicit authorization.
- Record source revision/dirty diff, viewport, browser version and design revision
  for visual checks. Match fonts, locale and motion preferences.
- Keep large logs/images in bounded files. Authored data and selected exports
  have durable owners. Retention is not yet implemented.
- Native service restarts need an approved idle window. Never print tokens,
  protected service registration or full configuration into diagnostics.
