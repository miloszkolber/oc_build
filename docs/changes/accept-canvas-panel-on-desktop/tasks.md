# Tasks

## 1. Prepare the acceptance run

- [ ] 1.1 Build and package Canvas from the current commit, and run `bun test`.
- [ ] 1.2 Validate every emitted example in `dist/examples/`.
- [ ] 1.3 Install the ZIP through OpenChamber Extensions and approve the `/data/.db/openchamber/canvas/**` filesystem and `sessions` declarations.
- [ ] 1.4 Retain the prior installed directory and a canvas data backup before the reload.
- [ ] 1.5 Reload the client so the updated Canvas entry is discovered.
- [ ] 1.6 Confirm no canvas file mtime changes across a session of ordinary panel interaction.

## 2. Run the operator review

- [ ] 2.1 Open Canvas from the rail in the desktop client.
- [ ] 2.2 Review a conversation's canvas in light and in dark mode.
- [ ] 2.3 Review tables, charts and at least one Mermaid diagram at a desktop viewport.
- [ ] 2.4 Start a subagent task and confirm the top-level conversation's canvas is shown.
- [ ] 2.5 Use the empty state's copy button and the insert-into-composer button.
- [ ] 2.6 Rename or remove a canvas file and confirm the empty canvas and the non-shifting error notice.
- [ ] 2.7 Record the desktop client version and the Canvas version that was reviewed.

## 3. Record the outcome

- [ ] 3.1 On acceptance, apply the delta in `specs/canvas-panel/spec.md` and archive this change.
- [ ] 3.2 On rejection, convert each observed defect into a task in this change with a reproduction and a verification step.
- [ ] 3.3 Update `extensions/canvas/VERIFICATION.md` with the desktop client version regardless of outcome.

## 4. Close out

- [ ] 4.1 Re-run `bun test` and the package step to confirm the reviewed artifact matches the source.
- [ ] 4.2 Confirm the installed version, the packaged ZIP name and the recorded client version agree.
- [ ] 4.3 Note any follow-up that is a different intent as a new change rather than extending this one.
