# Tasks

## 1. Track the upstream projection

- [ ] 1.1 Record the exact upstream issue or release that carries the projection, with its URL.
- [ ] 1.2 Record which API surface the projection is expected to appear on.
- [ ] 1.3 Note the OpenCode version currently deployed on Core, so the gap is dated.

## 2. Write the verification checks

- [ ] 2.1 Write the projection check: confirm user text and assistant text or reasoning are selected before serialization, and tool and provider state is excluded without omitting searchable text.
- [ ] 2.2 Write the regression check: large tool state plus ordinary searchable text does not overflow transport, and paging retains order and cursors and finds known user and assistant phrases.
- [ ] 2.3 Write the rollout check: native data is backed up consistently, the idle window is approved, and sessions and the search database are preserved.
- [ ] 2.4 Write the acceptance check: backfill and live indexing complete without silent skips, search returns expected snippets and session IDs, and ordinary APIs and realtime connections stay stable.
- [ ] 2.5 Make every check record the OpenCode version it ran against.

## 3. Prepare the rollout procedure

- [ ] 3.1 Write the consistent native backup procedure, covering both the session data and the search database.
- [ ] 3.2 Define the approved idle window and how a restart inside it is requested.
- [ ] 3.3 Define the rollback step: set `messageSearchEnabled=false` and restore the backup.
- [ ] 3.4 Confirm the procedure does not delete historical records, index placeholders, raise memory limits blindly or rely on a reduced page size.

## 4. Run and decide

- [ ] 4.1 Run the four checks against a service that has the projection.
- [ ] 4.2 Record each result with the OpenCode version it ran against.
- [ ] 4.3 Enable indexing only when all four pass.
- [ ] 4.4 Confirm search returns expected snippets and session IDs for a known phrase.
- [ ] 4.5 Confirm ordinary APIs and realtime connections stayed stable through the backfill.

## 5. Close

- [ ] 5.1 Apply the delta in `specs/host-runtime/spec.md`.
- [ ] 5.2 Move the investigation artifacts out of `/tmp` into a durable location if they are still needed.
- [ ] 5.3 Record the date indexing was re-enabled and the version it was enabled on.
