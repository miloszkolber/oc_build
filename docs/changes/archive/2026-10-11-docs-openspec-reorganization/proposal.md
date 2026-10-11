# Proposal: Reorganize the documentation on OpenSpec principles

## Intent

The repository's documentation was three files at the top of `docs/`, each
mixing several concerns. `ROADMAP.md` held goals, per-area status, subtasks and a
document-owner table. `visual-coding.md` held a capability contract, six phase
contracts, a tool survey, safeguards and references. `reliability.md` held
runtime boundaries, a search blocker with its acceptance conditions, and
statements about the minimal image's prerequisites.

None of them said what they were. A reader could not tell current behavior from
proposed work, could not tell where a change should be recorded, and had no
index. Adding a fourth file would have made it worse.

This change reorganizes the set on OpenSpec principles: `specs/` for current
behavior, `changes/` for one folder per proposed modification, `explorations/`
for analysis that is not yet a decision, and a README that maps the whole thing.

## Scope

In scope:

- Creating `docs/specs/` with one capability spec per deliverable and boundary.
- Creating `docs/changes/` with a folder per open roadmap item.
- Creating `docs/explorations/` for the phase contracts and the tool survey.
- Creating `docs/README.md`, `docs/project.md` and `docs/config.yaml`.
- Removing the three former files, with every substantive statement migrated.

Out of scope:

- Changing any source, workflow, image or extension.
- Changing any package README, which keeps owning its own build commands.
- Back-filling specifications for code nobody is changing.

## Approach

Map existing content by subject rather than by file. Each of the three files
covered several subjects, and the same subject often appeared in more than one
file. The reorganization sorts statements by what they describe, and lets the
OpenSpec structure assign each a home:

| Subject | Home |
| --- | --- |
| How the app image must behave | `specs/app-image/spec.md` |
| How the browser image and MCP must behave | `specs/browser-mcp/spec.md` |
| How the Canvas panel must behave | `specs/canvas-panel/spec.md` |
| How the Rembric plugin must behave | `specs/rembric-plugin/spec.md` |
| How publication and monitoring must behave | `specs/release-pipeline/spec.md` |
| The external OpenCode boundary and its limits | `specs/host-runtime/spec.md` |
| The agent-surface parity contract and safeguards | `specs/visual-coding/spec.md` |
| An open or paused item | a folder in `changes/` |
| Analysis that is not a decision | `explorations/` |
| Repository identity and layout | `project.md` |
| The index, status and conventions | `README.md` |

## Changes

**New structure**

- From: `docs/ROADMAP.md`, `docs/visual-coding.md`, `docs/reliability.md`.
- To: `docs/README.md`, `docs/project.md`, `docs/config.yaml`,
  `docs/specs/<capability>/spec.md` for seven capabilities,
  `docs/changes/<change-name>/` for six changes, and `docs/explorations/`.
- Reason: Separate current behavior from proposed work, and give every subject
  one owner.
- Impact: Documentation only. No source, workflow or image change.

**Roadmap status function**

- From: A status-first roadmap with a per-area status line and checkboxes.
- To: A "Status by change" table in `docs/README.md`. Status is a property of a
  change; completed work has no status because its deltas are already in
  `specs/`.
- Reason: A roadmap file that lists done areas next to open ones invites a
  reader to treat both as live.
- Impact: Documentation only.

**Content migration**

- From: Every statement in the three former files.
- To: The same statements in their new homes, converted to requirements and
  scenarios where they describe behavior.
- Reason: A reorganization that loses content is a rewrite.
- Impact: None. No statement was dropped; see the mapping table above.

**Cross-references**

- From: `extensions/canvas/VERIFICATION.md` referenced `docs/ROADMAP.md`.
- To: It references `docs/` generally.
- Reason: The referenced file no longer exists.
- Impact: One line in one file.

## Acceptance checks

| Check | How it is verified |
| --- | --- |
| Every subject from the three former files has a home | Walk the mapping table against the new files |
| Every spec follows the OpenSpec format | Each spec has a `## Purpose` and `### Requirement:` blocks with `#### Scenario:` children |
| Every change has a proposal, a delta and tasks | List the change folders and confirm the files exist |
| No file claims to own another file's subject | Read the owner table against the actual contents |
| The former files are gone | Confirm the three paths no longer exist |
| Root README points at the documentation | Read the root README |

## Rollback

Restore the three former files from git and remove the new structure. Nothing
outside `docs/` depends on the new paths except one line in
`extensions/canvas/VERIFICATION.md`, which restores with it.

## Status

Complete. This entry is the change's archive record: its deltas describe a
structure that now exists, and the folder is retained for the reasoning above.
