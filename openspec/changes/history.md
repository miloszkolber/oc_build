# Change history — 2026-10-11

Completed OpenSpec changes, consolidated from per-change archive directories
into this single record. Each entry summarizes the decision and outcome; the
full proposals, tasks and evidence remain recoverable from git history prior
to the consolidation commit. Main specs carry the merged contract; this file
carries the reasoning.

## Spec-driven documentation review (2026-10-11)

Reorganization had mixed implemented contracts with proposed designs and
overstated verification. Independent review consolidated documentation against
source, removed unsupported archive claims and duplicate plans, exposed the
single `openspec` docs tree and added local/CI validation (`check-docs`,
pinned OpenSpec 1.14.1). `skip_specs: true`; no runtime changed. Lasting rule:
archive requires a reviewed manual spec merge first; git history retains
removed material and speculative requirements stay out of main specs.

## Agent sandbox review (2026-10-11)

Reviewed the sandbox image/launcher lifecycle, storage, adoption and release.
Bound launcher execution to the host runtime (separate from the rootless build
endpoint), made cleanup stop containers and lock active runs, tested argument
routing/signals/cleanup, and added the `agent-sandbox` capability spec plus a
workspace rule: future development tools go into the image, not the host.
Verified with real builds, cache reuse and CI-equivalent checks. Hosted
publication stayed a separate gate.

## Sandbox integration closure (2026-10-11)

Acceptance pass over the merged artful-yak implementation (`877cf73`):
reviewed archive content for current owners, verified the integrated release
tree, fixed broken archive links, completed the release workflow inventory.
Documentation and acceptance only; no publication, deployment or restart.
Removed the clean merged worktree/branch; implementation and history live on
in the merge commit.

## Canvas render integrity (2026-10-11)

Operator review found four defects: diagrams latched fatal errors when
rendering started while the guest document had no layout box, series were
distinguished by color alone, scroll containers reserved gutter width, and the
preview pinned a different font than the panel. Fixed with deferred diagram
rendering plus one transient retry, redundant pattern/fill series encoding
(single-series stays solid), gutter-free scroll containers and single focus
ownership. Released and installed Canvas 0.9.13 (42 tests, 238 assertions;
118-file ZIP; installed copy identical, 0.9.12 backup).

## Canvas review completion (2026-10-11)

Independent review found 0.9.13 claims exceeding evidence (monospace preview,
missing error styling, horizon-resetting polls, misleading zero/tiny marks,
unreviewed narrow states). Repaired within the existing visual direction:
reviewed all gallery components, cost controls, long/zero data, themes and
narrow layouts with a synthetic SDK host. Released and installed Canvas 0.9.14
(54 tests, 302 assertions; 118-file ZIP; grants unchanged). Native desktop
acceptance explicitly left operator-owned; MCP evidence never claimed as
native acceptance.

## Canvas review gap closure (2026-10-11)

Closed two remaining mismatches: ratings outside the half-star interval lost
their fraction, and entries 6 and 11 reused the same fill/pattern pair.
Ratings now clip proportionally; six patterns cycle against five fills for 30
unique automatic pairs. Fault-injected Mermaid retry/cancellation (serialized,
max concurrency one, no stale retries). Released and installed Canvas 0.9.15
(55 tests, 316 assertions; 118-file ZIP; nine packaged entries recursively
equal to installed copy).

## Visual language refinement (2026-10-11)

Operator annotations found decorative color, noisy chart textures and
oversized Mermaid graphics. Shared-renderer corrections: top-right metric
changes, stronger headings, no callout stripe, monochrome ordinary
ratings/choices/checklists/steps/timeline dots, solid first five fills with
sparse patterns only on repeats, intrinsic-size neutral Mermaid diagrams.
Second iteration: same-measure BarChart/CostChart rows share one solid accent
with direct labels/values (no per-row keys); sequence text resolves to the
host font at 13px; pies use a quiet chart palette separate from node
surfaces. Reference analysis (IBM, Carbon, Uber, Data Viz Project; Salesforce
page unreadable, supplied example analyzed) and scoped contrast samples are
summarized from the former `design.md`/evidence. Commits `178cb91` and
`bbd1e41` (59 tests, 334 assertions). Chart color stays allowed when justified
by series, magnitude, highlight or state — informed by the monochrome
read-vs-scan rule now in the shared workspace guidance.

## Native desktop acceptance (2026-10-11)

Operator granted explicit visual/native approval ("Approved, works well"),
with chart color permitted when justified. This is operator-reported
acceptance, not assistant-executed desktop tests: no desktop-client version,
native screenshots or per-scenario results were supplied, and tasks 1.1–1.6
are explicitly waived by the approval rather than silently dropped. Approved
source released and installed as Canvas 0.9.16 (118-file ZIP
`04fbfedc…b00b`, main bundle `27f5d11d…2497`; installed copy recursively
identical to `dist/`; manifest authority unchanged; 0.9.15 backup retained;
authored canvases untouched; no service restarted). Client reload to discover
the new version is operator-side.

## Workspace skill addition (2026-10-11)

Added `skill/` to the repository (entry, maintainer guide, Canvas/browser/
sandbox references), listed it in the root README layout and covered it with
the documentation check. Documentation/layout change only; no capability
requirement changed, no deployment authorized. The in-repo copy is a snapshot
of the canonical workspace guidance and must be re-synced when the master changes.

## Sandbox runs through Compose (2026-10-11)

The sandbox was run by a ~100-line host wrapper that created per-run scratch,
held locks, scanned for stale runs, forced a Docker endpoint and mounted a
socket. Dropping the Docker capability removed the endpoint and socket work, so
Compose now provides the rest declaratively. The wrapper and its 122-line
regression suite are deleted; the deployment's Compose service pins the
non-root identity, mounts the workspace roots plus the shared cache, gives each
run a private temporary filesystem, publishes loopback ports on request and
removes the container on exit. An optional deployment-local alias shortens the
common build/test case. The image workflow trigger narrowed to image-affecting
paths, so documentation changes no longer rebuild the image. Docker is now
managed with the host's own Docker, compose and buildx.

## Sandbox drops Docker (2026-10-11)

The sandbox is for reproducible development toolchains, not container builds.
Removed the Docker CLI, compose and buildx from the image and from its check
(the check now asserts their absence), and dropped `DOCKER_HOST` and the
rootless socket bind mount from the launcher while keeping explicit host-runtime
selection. Retired the host rootless Docker user unit, its socket and its 7 GB
data root; the host rootful daemon and `default` context are unchanged. Verified
with the image check, 9 launcher regressions (including a new "no Docker endpoint
reaches the container" case), the documentation checks and a pulled GHCR image.
Container builds now run on the host runtime directly.
