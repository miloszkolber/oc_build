# Integration closure evidence

Date: 2026-10-11. Base: merge 877cf73, retaining artful-yak 1a59a1c as a parent.
User requested archive-content distribution, review/closure and source-branch
retirement. No registry push, deployment or service restart was performed.

## Archive distribution review

| Archive | Current owner | Review outcome |
| --- | --- | --- |
| canvas-render-integrity | canvas-panel spec, Canvas README and VERIFICATION.md | The modified requirement is retained verbatim. Fixed two links broken by archival. Historical rendering evidence remains dated; finish-canvas-review and native desktop acceptance are not closed by this work |
| review-agent-sandbox | agent-sandbox spec, docker/sandbox README, workflow and workspace reference | All five requirements are retained verbatim. Completed the release-pipeline workflow inventory and README verification commands. Fixed the shared reference's obsolete docs/README.md path |
| review-spec-driven-documentation | openspec README, project/config/backlog, AGENTS.md and docs CI/checker | Current workflow is already distributed. Former alias workaround remains historical only; the physical-directory procedure is authoritative |

Keep the three archives intact as provenance, not active instructions. No
useful remaining contract requires scattering archive history into other files.
The shared reference correction is committed separately in the host repository
as 5a07c68 at agents/skills/workspace/references/sandbox.md.

## Clean release-snapshot verification

Snapshot: git archive of 877cf73 plus this closure's documentation changes at
/data/.db/openchamber/ship-review-bright-heron. The active Canvas edits and
finish-canvas-review folder were excluded. Commands ran through sandbox run.

- bun scripts/check-docs.mjs: 29 Markdown files, zero failures before archive.
- bun test scripts/check-docs.test.mjs: eight passed.
- OPENSPEC_TELEMETRY=0 openspec validate --all --strict: eight passed before archive.
- node --test docker/sandbox/sandbox.test.mjs: eight passed under Node 22.23.3.
- bash docker/sandbox/check-image.sh: installed image tool/cache checks passed.
- bun test docker/openchamber/releases.test.mjs docker/openchamber/latest.test.mjs docker/openchamber/entrypoint.test.mjs: 42 passed plus entrypoint retry/CLI handoff.
- Canvas frozen installation, 42 tests, packaging and both emitted example validators passed. ZIP: 0.9.13, 118 files.
- Rembric bundle built. The workflow's default-export check passed: id rembric.lifecycle and callable setup. An initial probe incorrectly expected the obsolete named RembricPlugin export; source and CI confirmed the V2 default-export contract, not a product defect.
- Archived sandbox and Canvas requirement blocks compared verbatim with main specs: five and one respectively retained.

## Remaining gates

Hosted Actions and registry publication are not executed or claimed here.
Canvas native desktop acceptance remains open. The unrelated in-progress Canvas
review is not release-ready merely because the committed integration passes.
No new app/browser image validation or live plugin lifecycle acceptance is
claimed. This closure covers the sandbox integration and documentation.

## Image build and branch retirement

The clean snapshot built openchamber-sandbox:ship-review in the dedicated
rootless daemon. Image manifest-list digest:
sha256:99160fc875d4891f22586f7ac318f6484877e6390b38b205572f93b94559617a.
Both the build-time network-disabled check and a fresh offline container check
passed. All four CI-equivalent validation steps ran against that newly built
image with the clean snapshot mounted at /repo: eight Node launcher tests,
eight Bun documentation tests, zero structural failures and eight strict
validation items. The image is retained locally, not deployed to the launcher.

git merge-base --is-ancestor artful-yak HEAD passed. The source worktree had
no tracked or untracked edits. Non-forced git worktree remove and git branch -d
removed artful-yak at 1a59a1c. The merge retains its commits and dated review,
so a redundant backup tag was unnecessary. No session database was modified.

OpenSpec 1.14.1 archived the documentation-only closure with --skip-specs --yes.
No requirement delta was omitted. The archive command warned about the final
incomplete archive/commit task and a missing What Changes heading. After the
successful archive, the task was narrowed to the verified staged-diff boundary,
marked complete and the heading corrected.

Final staged-tree snapshot after archive: 30 Markdown files, zero structural
failures, eight documentation regression tests passed, and seven strict
validation items passed. git diff --cached --check passed. The staging area
contains only the seven closure-owned files, not the active Canvas review.
The committed sandbox integration is ready for publication review. That does
not establish readiness of the unrelated working-tree Canvas changes.
