# Tasks

## 1. Prepare the runner

- [ ] 1.1 Add the opt-in frontend runner to the target application repository, scoped to this work.
- [ ] 1.2 Pin the OpenPencil CLI and record the exact version used.
- [ ] 1.3 Record the macOS app version and the file-sharing path the operator supplies.
- [ ] 1.4 Confirm the runner does not widen the browser MCP, the app image or any published artifact.

## 2. Run the application's own suites

- [ ] 2.1 Run `bun run test:browser` in the application repository and capture the full result.
- [ ] 2.2 Run `bun run test:performance` and capture the full result.
- [ ] 2.3 Record the toolchain versions both suites ran under, so a later failure can be attributed.

## 3. Inspect desktop and mobile

- [ ] 3.1 Inspect the application at a desktop viewport in light mode and record the viewport.
- [ ] 3.2 Inspect the same page in dark mode.
- [ ] 3.3 Inspect at a mobile viewport in light and dark mode.
- [ ] 3.4 Capture before and after images for each combination and store them in a bounded file.

## 4. Measure the handoff

- [ ] 4.1 Import the resolved HTML and CSS into the design file.
- [ ] 4.2 Compare the imported page against the live page and record every font loss.
- [ ] 4.3 Record every layout loss, with the element and the observed difference.
- [ ] 4.4 Record every component loss, including any component that imports as a static image.
- [ ] 4.5 Close, reopen and export the file, then repeat the comparison.
- [ ] 4.6 Write the loss record as evidence rather than a summary, so a later run can compare against it.

## 5. Decide and close

- [ ] 5.1 Record the operator's decision on whether the runner stays available.
- [ ] 5.2 If a later phase is wanted, note that it needs its own authorization and its own change.
- [ ] 5.3 On completion, remove the scoped wrapper and test changes and confirm the application repository is clean.
- [ ] 5.4 Preserve the original `.fig` and HTML files untouched.
