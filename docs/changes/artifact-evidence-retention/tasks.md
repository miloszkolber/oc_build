# Tasks

## 1. Declare the disposable directories

- [ ] 1.1 List the directories that hold review images, logs and probe artifacts.
- [ ] 1.2 Confirm each listed directory holds nothing the operator authored.
- [ ] 1.3 Record the list in one place, so the retention pass reads a declaration rather than a scan.
- [ ] 1.4 Confirm the directories that must never be touched: canvas data, chat data, backups, lockfiles, design files and operator-selected exports.

## 2. Define the bounds

- [ ] 2.1 Choose the age bound in days and record why that value.
- [ ] 2.2 Choose the size bound per directory and record why that value.
- [ ] 2.3 Define how an artifact is marked as an operator-selected export.

## 3. Write the pass

- [ ] 3.1 Write the retention script reading the declaration, the age bound and the size bound from one configuration file.
- [ ] 3.2 Remove by declared directory, never by a pattern that could match outside it.
- [ ] 3.3 Enforce both bounds, removing the oldest first when the size bound is exceeded.
- [ ] 3.4 Skip anything marked as an operator-selected export.
- [ ] 3.5 Report every removal with its reason, and exit non-zero only on a real failure.

## 4. Verify the boundaries

- [ ] 4.1 Plant marker files outside the declared directories and confirm they survive.
- [ ] 4.2 Plant a canvas file, a lockfile and a design file in their real locations and confirm they survive.
- [ ] 4.3 Create an artifact older than the age bound and confirm it is removed and reported.
- [ ] 4.4 Create a directory over the size bound and confirm the oldest artifacts are removed first.
- [ ] 4.5 Mark a file as selected and confirm it survives a run that removes its neighbors.
- [ ] 4.6 Confirm the pass completes without blocking and without prompting.

## 5. Wire and document

- [ ] 5.1 Add an on-demand entry point, and a schedule only if the operator wants one.
- [ ] 5.2 Apply the delta in `specs/release-pipeline/spec.md`.
- [ ] 5.3 Record the bounds, the declared directories and the reason for each in the README that owns the script.
- [ ] 5.4 Note that the visual-coding safeguard in [`specs/visual-coding`](../../specs/visual-coding/spec.md) is satisfied by this mechanism.
