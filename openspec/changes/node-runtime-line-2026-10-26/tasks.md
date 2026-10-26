# Tasks

- [x] 1.1 Move both runtime stages to `nodejs24-debian12` and update the two image checks' Node major assertion. Verified by the builds and checks below.
- [x] 1.2 Build the app image at 2.5.2 and run `check-image.mjs` under the publication flags. Verified by exit 0 and `v24.14.0` inside the image.
- [x] 1.3 Build the browser image and run `check-image.mjs` under the publication flags. Verified by exit 0 and the real Chromium check.
- [x] 1.4 Record image sizes for the operator comparison. Verified by `docker image inspect`.
- [ ] 1.5 Operator decision, then update the app README runtime statement, run the documentation checks and publish through the normal workflows.
- [ ] 1.6 After publication, verify the running app against a real OpenCode 2.1.4 server: startup, terminal, Git, extension frames and the browser MCP over its authenticated loopback endpoint.
