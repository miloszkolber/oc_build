# Runtime reliability boundaries

## External OpenCode paths

With OpenChamber in a container and OpenCode native on the host, workspace paths must exist at the same absolute path in both environments. App-local filesystem success and a healthy server do not establish native workspace bootstrap.

Core uses `/data/.db/openchamber` as both host and container state root, `/data/.db/openchamber/chats` as the managed Chats root, and `/home/core` as home. The app retains `/home/core` and `/repo` mounts. Do not mount the state tree only under `/home/openchamber/.config/openchamber` and then pass that container-only directory to native OpenCode.

Verify `/api/fs/home`, then location/config/form/permission bootstrap scoped to the returned Chats root. Create/read/delete only an owned probe session, inspect the UI warning, and preserve authored Chats data. `LocationNotFoundError` is not evidence for recursive ownership/permission changes.

## Native search projection blocker

OpenChamber indexes user text and settled assistant text, with reasoning optional. Its indexer ignores tool outputs, but the native message API first returns the complete record including tool state. Oversized historical records can fail during native serialization before OpenChamber can discard that state.

Observed against OpenCode 2.0.26: three historical sessions, `ses_f69ffecb2ffevXWyM9gTW6U2yp`, `ses_f4b393a38ffeDBZa4EEn2tGnHO`, and `ses_f5ae52f07ffeBr0B6lMLMlUl41`, stall on assistant reads. Pages of 100 and 10 stall. One-record paging succeeds on ordinary records, then stalls on another record in the first stream. Prior logs include `Cannot create a string longer than 0x1fffffe8 characters` and transport termination. This is a native record-transport problem, not a missing SQLite permission or simply too-large index batches.

The inspected API supports message type, limit/order/cursor, but no content projection. Sanitized export also redacts user/assistant searchable text, so it cannot repair search fidelity.

| Work | Required result |
| --- | --- |
| Native bounded projection | Select user text and assistant text/reasoning before JSON serialization. Exclude tool/provider state without omitting searchable text. Use a supported API or native reader, not an ad-hoc writable database adapter. |
| Regression | Large tool state plus ordinary searchable text does not overflow transport; paging retains order/cursors and finds known user/assistant phrases. |
| Rollout | Back up native data consistently before any migration. Use an approved idle window if a native service restart is required. Preserve sessions and search database. |
| Acceptance | Backfill and live indexing complete without silent skips/placeholder indexing; search returns expected snippets and session IDs; ordinary APIs/realtime connections stay stable. |

Until repaired, Core keeps `messageSearchEnabled=false`. This stops indexing but preserves its database and sessions. Do not delete historical records, index sanitized placeholders, raise memory limits blindly or call reduced page size a complete fix. Host runbook/roadmap own the current status. Probe artifacts are under `/tmp/opencode/openchamber-reliability/`.

## Minimal does not mean missing native prerequisites

The app's distroless Node base includes only explicit OS-tool exceptions: Bash/Git, one BusyBox for basic commands and model-archive extraction, SSH for Git remotes, and a real `ps` for terminal process-group cleanup. UID 1000 has a passwd/group identity. Chromium and agent QA remain in the separate distroless browser image.

Feature checks must include real PTY I/O and command execution, not only terminal creation. Framework builds, package managers, local speech models and external integration credentials remain feature/project prerequisites; they are not all baked into the web server. The standalone MCP needs no agent-side browser installation for its documented QA tools.
