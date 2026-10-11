# Proposal: Evidence retention

## Intent

Visual and browser reviews produce images, logs and probe artifacts. Right now
they accumulate wherever they were written. Some are disposable: a screenshot
taken to compare a breakpoint, a console dump from a dead end. Some are evidence
the operator wants to keep: a before-and-after pair that justified a change, a
probe artifact that proved a defect.

There is no rule that separates the two, so either everything accumulates or the
operator deletes things by hand and sometimes loses the valuable half.

This change adds an age and size based retention pass that is explicitly
non-blocking, preserves authored data and operator-selected exports, and names
where disposable evidence goes.

## Scope

In scope:

- Defining the directories that hold disposable review evidence.
- An age and size based retention pass over those directories only.
- A criterion for what counts as an operator-selected export and is therefore
  preserved.
- Confirming the pass never blocks work.

Out of scope:

- Touching any authored data: canvas files, chat data, lockfiles, design files,
  backups or exported artifacts the operator chose to keep.
- Changing how reviews record evidence. The existing requirement to record
  source revision, viewport, browser version and design revision stays as is.
- Any always-on service. The pass runs on demand or on a schedule, and both are
  acceptable.

## Approach

The boundary is the whole design. Retention applies to a declared set of
disposable directories and nowhere else, and the preservation rule is opt-in
rather than opt-out: an artifact survives only if it is authored data or the
operator moved it somewhere durable. That matches the existing statement that
authored files, designs and lockfiles keep their durable owners and disposable
profiles do not replace workspace dependencies or backups.

The pass is bounded by both age and size, and it reports what it removed rather
than removing silently.

## Changes

**Retention in specs/release-pipeline and specs/visual-coding**

- From: Both specifications state that automatic artifact age and size retention
  remains non-blocking and preserves authored data and operator-selected
  exports. Neither describes a mechanism.
- To: A requirement naming the disposable evidence directories, the age and size
  bounds, the preservation criterion, and that the pass reports what it removed
  and never blocks work.
- Reason: The safeguard currently exists as a promise with nothing behind it.
- Impact: One new script and its documentation. No change to images, workflows
  that publish, or any authored data path.

**Relationship to the visual-coding safeguard**

- From: The visual-coding spec lists "Automatic artifact age and size retention
  remains non-blocking" as a safeguard.
- To: Unchanged, and now backed by the retention requirement.
- Reason: One owner per subject; the mechanism lives with the pipeline, the
  safeguard keeps pointing at it.
- Impact: None.

## Acceptance checks

| Check | How it is verified |
| --- | --- |
| Only declared disposable directories are touched | Plant marker files outside them and confirm they survive |
| Authored data survives | Plant a canvas file, a lockfile and a design file in their real locations and confirm they survive |
| Age and size bounds are honored | Create artifacts older than the bound and larger than the bound and confirm each is removed |
| Operator-selected exports survive | Mark a file as selected and confirm it survives a run that removes its neighbors |
| The pass is non-blocking | Confirm it runs to completion and reports, rather than waiting on anything |
| Removals are reported | Confirm the run lists what it removed, with the reason for each |

## Rollback

Remove the script and its configuration. Nothing else reads it, so removing it
restores the previous state exactly, and any directory it would have cleaned is
left as it was.

## Status

Paused. Agreed in principle, not yet scheduled.
