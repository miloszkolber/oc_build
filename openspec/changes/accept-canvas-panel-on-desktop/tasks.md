# Tasks

## 1. Native acceptance

- [ ] 1.1 Record installed Canvas, desktop-client and source versions in `evidence.md`, verifying them against the reviewed installation.
- [ ] 1.2 Open the panel in light/dark at desktop/mobile widths, checking tables, charts and a diagram for clipping, readability and console errors.
- [ ] 1.3 Switch conversations and enter a child session, checking the expected canvas and absence of late cross-session results.
- [ ] 1.4 Exercise copy/insert, local sort/filter, tabs and horizon controls. Confirm insertion is not sent automatically and authored file hashes/mtimes remain unchanged.
- [ ] 1.5 Use an owned probe canvas to test missing and invalid content. Confirm empty/error behavior and preserved last-good rendering, then restore/remove only the probe.
- [ ] 1.6 Record the operator's acceptance or reproducible defects with screenshots and exact scope in `evidence.md`. Keep this change open if acceptance is withheld.

## 2. Matched review surfaces

- [x] 2.1 Replace the default synthetic preview palette with captured guest-theme tokens matching the selected host themes.
- [x] 2.2 Serve the conversation's exact JSON using the packaged Canvas entrypoint, without preview chrome or styling overrides.
- [x] 2.3 Check source/artifact hashes, rendering and token values. Record the browser font-resolution limitation separately from CSS parity.

## Workflow follow-up

- Archive only after operator review. A new release is not automatically covered by an earlier acceptance.
