# Proposal: Monitor app image base versions

## Intent

Dependabot keeps the Bun dependency directories and GitHub Actions current, but
the app image's base versions are not covered by any of those ecosystems. Node
22, the Debian bookworm frontend and the distroless base change underneath the
image with no pull request, no digest check and no schedule.

Dependency monitoring is a done roadmap area precisely because it should not
need attention. Leaving the base versions outside it means the one dependency
that determines whether the image still builds is the one nobody watches.

## Scope

In scope:

- A scheduled, scoped check of the app image's base versions against their
  upstream sources.
- A digest comparison for the versions the image pins, so a change is visible
  before it breaks a build.
- A workflow that reports drift on a schedule and on manual dispatch.

Out of scope:

- Automatically bumping base versions. A bump stays a deliberate, reviewed
  change, consistent with how Mermaid is pinned so upgrades are deliberate.
- Changing the app image's tool exception set.
- Covering the browser image's base versions, which the existing Bun ecosystem
  entry and its own rebuild schedule already exercise.
- Any change to published image tags or promotion behavior.

## Approach

Extend the existing monitoring shape rather than introducing a new mechanism.
The repository already has a pattern for "a scheduled job that checks something
about the images and fails loudly": the browser workflow rebuilds weekly and the
Build workflow rebuilds the newest release on the Monday 04:37 schedule. This
change adds a check that reads the pinned versions from the Dockerfile, resolves
their current digests through the `mirror.gcr.io` cache, and reports drift.

The important property is that a cache miss fails explicitly, which the images
already require. A drift report is information, not a merge queue.

## Changes

**Base version monitoring in specs/release-pipeline**

- From: Dependency monitoring covers the two Bun directories and GitHub Actions.
  The standing obligation to recheck cached base-image availability when a base
  version changes exists in [specs/app-image](../../specs/app-image/spec.md) and
  [specs/browser-mcp](../../specs/browser-mcp/spec.md), but nothing enforces it.
- To: A requirement that app image base versions are monitored on a schedule
  with digest comparison, that drift is reported without an automatic bump, and
  that a cache miss fails the check explicitly.
- Reason: The standing obligation currently has no mechanism behind it.
- Impact: One new workflow file. No change to image contents or tags.

**Relationship to the standing obligation**

- From: "Recheck cached base-image availability whenever a base version changes"
  is listed as a standing obligation in [`docs/README.md`](../../README.md).
- To: The obligation is satisfied by this change and can be referenced from the
  spec rather than restated as an unenforced rule.
- Reason: An obligation with no mechanism behind it is a note, not a control.
- Impact: Documentation only.

## Acceptance checks

| Check | How it is verified |
| --- | --- |
| The check reads the versions the image actually pins | Change a pinned version in the Dockerfile and confirm the check reports the new value |
| Digest drift is detected | Point the check at a stale recorded digest and confirm it fails |
| A cache miss fails explicitly | Run the check with an unreachable cache and confirm an explicit failure |
| No automatic bump | Confirm the check opens no pull request and modifies no Dockerfile |
| Schedule and dispatch both work | Confirm the cron entry and the manual dispatch input run the same check |

## Rollback

Delete the workflow file. The app image, the browser image and every existing
workflow are untouched, so removing it restores the previous state exactly.

## Status

Next. Agreed and unblocked.
