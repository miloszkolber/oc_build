# Proposal: Repair native search projection

## Intent

OpenChamber's native message API returns the complete record for a session,
including tool and provider state, before a caller can discard it. Its indexer
ignores tool outputs, but it cannot get past the transport: oversized historical
records fail during native serialization before OpenChamber ever sees them.

The result is that search stays disabled on Core. The database and the sessions
are preserved, but the operator cannot search their own history, and the reason
is recorded rather than fixed.

This change repairs the projection so indexing can be re-enabled, and defines
the acceptance that makes re-enabling safe.

## Scope

In scope:

- A native bounded projection that selects user text and assistant text or
  reasoning before JSON serialization, excluding tool and provider state without
  omitting searchable text.
- A regression suite covering large tool state, paging order and cursors, and
  known-phrase retrieval.
- A rollout procedure with a consistent native data backup and an approved idle
  window.
- An acceptance run covering backfill, live indexing and stability of ordinary
  APIs.

Out of scope:

- Any workaround of the kind the specification already rejects: deleting
  historical records, indexing sanitized placeholders, raising memory limits
  blindly, or calling a reduced page size a complete fix.
- Changing the indexer's behavior about which text it indexes.
- Any change to the app image, the browser image or the Canvas extension.

## Approach

The repair belongs upstream, in OpenChamber's own message API. This repository
cannot implement it, so this change is a tracked request with a precise
acceptance contract: the four conditions in the specification, stated as
verifiable results, so an upstream fix can be tested against them rather than
assumed.

The repository-side work is the rollout and acceptance procedure, which has to
exist before indexing is turned back on regardless of who implements the
projection.

## Changes

**Repair acceptance in specs/host-runtime**

- From: The specification states the observed failure, the diagnosis, and that
  `messageSearchEnabled` is false until repaired. It lists the four conditions
  in a table.
- To: A requirement that each of the four conditions is verified by a named
  check, that the checks are recorded with the OpenCode version they ran
  against, and that enabling indexing requires all four to pass.
- Reason: A table of conditions is not a gate. This makes the gate explicit.
- Impact: Documentation only. No repository code change.

**Prohibited workaround boundary**

- From: A scenario lists four rejected workarounds.
- To: Unchanged. This change adds no new workaround.
- Reason: Recording that the change does not weaken the boundary matters more
  than restating it.
- Impact: None.

## Acceptance checks

| Condition | Required result |
| --- | --- |
| Native bounded projection | User text and assistant text or reasoning are selected before JSON serialization. Tool and provider state is excluded without omitting searchable text. A supported API or native reader is used, not an ad-hoc writable database adapter. |
| Regression | Large tool state plus ordinary searchable text does not overflow transport. Paging retains order and cursors and finds known user and assistant phrases. |
| Rollout | Native data is backed up consistently before any migration. An approved idle window is used if a native service restart is required. Sessions and the search database are preserved. |
| Acceptance | Backfill and live indexing complete without silent skips or placeholder indexing. Search returns expected snippets and session IDs. Ordinary APIs and realtime connections stay stable. |

Each condition is verified by a check that records the OpenCode version it ran
against, because the observed failure was version-specific.

## Rollback

Set `messageSearchEnabled` back to `false`. This stops indexing and preserves
the database and the sessions, which is the current state and the state the
specification already describes. A native data backup taken during rollout
restores the pre-migration state.

## Status

Paused. Deliberately disabled, and blocked on an upstream projection. The
investigation artifacts are under `/tmp/opencode/openchamber-reliability/`.
