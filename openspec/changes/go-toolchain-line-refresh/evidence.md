# Evidence

## Opening pass, 2026-10-19

Branch `maintenance/go-toolchain-line-2026-10-19`, based on `main` at `08e03f6`. Host Docker for image builds; commands run inside a locally built sandbox image.

- Rebuilt the sandbox image with `golang:1.26-bookworm`: it reported `go version go1.26.9 linux/amd64`, the build's own `check-image.sh` printed `sandbox image check OK`, and the `go1\.2[5-9]` assertion accepted the line unchanged.
- Baseline image carried `go version go1.25.14 linux/amd64`.
- All seven consumer modules passed `go build ./...` and `go vet ./...` under both lines.
- Upstream read: `go.dev/dl` (go1.25.14 newest 1.25; 1.26.9 and 1.27.2 newest of their lines), go1.26.9/go1.27.2 release notes, and the OSV `stdlib` query listing the twelve 2026-10-08 advisories.
- Not verified at the time: the consumer test suites, runtime behaviour, and 1.27.

## Closing pass, 2026-10-26

Operator chose the latest line. The branch was rebased onto `main` at `7d84bb8`; the only conflicts were the sandbox Dockerfile and README rows that had since moved to Bun 1.4.4 and uv 0.13.5, resolved by keeping those pins and changing only the Go source, so the change now targets `golang:1.27-bookworm`.

Image and check:

```
$ docker build -t openchamber-sandbox:go127 docker/sandbox
exit 0
$ docker run --rm --network none --entrypoint go openchamber-sandbox:go127 version
go version go1.27.3 linux/amd64
$ docker run --rm --network none --entrypoint bash openchamber-sandbox:go127 /usr/local/share/sandbox/check-image.sh
sandbox image check OK
```

The assembled inventory records `bun 1.4.4`, `go go1.27.3`, `node v22.23.4`, `pnpm 11.28.8`, `uv 0.13.5`, `openspec 1.15.0`.

Consumer suites under go1.27.3, each `go test ./... -count=1` in its own module directory with the repository mounted and the shared cache at `/cache`:

| Module | `go` directive | Test result | `go vet ./...` |
| --- | --- | --- | --- |
| `linkie` | 1.25.13 | ok (7 packages) | exit 0 |
| `magpie/server` | 1.24.0 | ok | exit 0 |
| `cuddler/server` | 1.25 | ok | exit 0 |
| `moonwalk/server` | 1.25 | ok | exit 0 |
| `submarine/server` | 1.24.0 | ok | exit 0 |
| `llama_build` | 1.25 | ok (3 commands) | exit 0 |
| `uncanny_lab` | 1.24.0 | ok (7 packages) | exit 0 |

`git status --porcelain` is empty in all seven after the runs, so the suites did not modify the working trees.

Advisory check, 2026-10-26: an OSV `stdlib` query returns 14 advisories affecting go1.25.14 and 0 affecting go1.27.3.

Not executed: each consumer's deployment or its own CI under the new line. That remains the owners' follow-through (task 3.3); nothing was deployed or restarted for this change.
