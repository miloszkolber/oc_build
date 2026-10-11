# Evidence

## Delivered

The sandbox image and launcher no longer carry or reach any container engine.

- `docker/sandbox/Dockerfile`: removed the `docker:29-cli` stage, both Docker
  CLI/plugin `COPY` steps and the `docker` line in the build inventory. Comment
  states container building is out of scope.
- `docker/sandbox/check-image.sh`: `docker` removed from the required-tool list;
  the compose and buildx plugin checks are gone; instead the check now *fails*
  if `docker`, `podman` or `buildx` is present.
- `docker/sandbox/sandbox` (launcher): dropped `DOCKER_HOST` from the container
  environment and removed the conditional rootless socket bind mount. The
  launcher still selects `unix:///var/run/docker.sock` explicitly for the
  toolkit container on the host, independent of caller Docker environment.
- `docker/sandbox/sandbox.test.mjs`: added a regression test asserting no
  `DOCKER_HOST`, no `DOCKER_CONTEXT`, no caller value and no Docker socket
  bind mount reach the container.
- `docker/sandbox/README.md`, `skill/references/sandbox.md` and its canonical
  master: toolchain table, boundaries, runtime routing and the in-sandbox
  container-build example updated to the toolchain-only scope.

## Checks

Build and image check on the host runtime:

```
docker build -t openchamber-sandbox:dropdock docker/sandbox
docker run --rm --network none --entrypoint bash openchamber-sandbox:dropdock \
  /usr/local/share/sandbox/check-image.sh
```

- Image check passed. Reported toolchain versions: bun 1.4.2, go go1.25.14,
  node v22.23.3, npm 10.9.9, pnpm 11.1.2, python 3.11.2, uv 0.13.0.
- Negative check: `command -v docker podman buildx` inside the image prints
  "no container tooling (expected)".
- Build inventory (`/usr/local/share/sandbox/sandbox-build.txt`) no longer lists
  docker.

CI-equivalent checks run with the built image:

- Launcher regressions: 9 tests, 9 pass, 0 fail (was 8 tests; the new
  no-endpoint assertion is included).
- Documentation check tests: 9 tests, 11 assertions, 0 fail.
- Repository documentation check: 23 Markdown files, 0 failures.
- Pinned OpenSpec 1.14.1 strict validation: 7 items passed.

The launcher was also syntax-checked and exercised directly (`sandbox run -- true`,
plus toolchain commands inside the sandbox) after the change.

Not verified here: the exact host retirement steps (2.1–2.4) are recorded in
`tasks.md` and were executed separately on the host, not in this image evidence.
