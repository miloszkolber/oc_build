# Go toolchain line refresh

Adopted by the operator on 2026-10-26: move the sandbox to the latest supported Go line (1.27). Prepared on `maintenance/go-toolchain-line-2026-10-19`, rebased and closed on 2026-10-26.

## Why

The agent sandbox copies its Go toolchain from `golang:1.25-bookworm`, which resolves to go1.25.14 (2026-08-19) — the last 1.25 patch. Go supports only its two newest release lines, so when go1.27.0 shipped the 1.25 line stopped receiving fixes.

The gap is not theoretical. The 2026-10-08 security releases fixed twelve `stdlib` advisories (GO-2026-6599 through GO-2026-6617) across the go command, `crypto/tls`, `html/template`, `net/http`, `net/textproto`, `mime/multipart` and `os`; none were backported to 1.25. Go links its standard library into the binary, so code built in this sandbox inherits them. Seven repositories here keep a Go module (`linkie`, `magpie/server`, `cuddler/server`, `moonwalk/server`, `submarine/server`, `llama_build`, `uncanny_lab`), and their deployed binaries are built with this toolchain. An OSV query on 2026-10-26 reports 14 advisories affecting stdlib go1.25.14 and none affecting go1.27.3.

No consumer requires a newer toolchain: their `go` directives are `1.24.0` to `1.25.13`, which both lines accept.

## What changes

- `docker/sandbox/Dockerfile`: the Go source image becomes `golang:1.27-bookworm`, resolving to go1.27.3 at the time of this change.
- `docker/sandbox/README.md`: the toolchain table records Go 1.27.
- `docker/sandbox/check-image.sh` needs no change: it already accepts `go1.2[5-9]`.

## Why this is not a routine merge

Go calls a new line a major release. Moving it changes the compiler, language version selection and standard library every repository here builds with, so it reaches past this repository's own verification: it needs the operator's decision and the consumer repositories' suites. The operator chose the latest line (1.27). That is a larger behaviour delta than 1.26 and a longer window before the next forced move.

## Verification

See [evidence.md](evidence.md): the image builds on go1.27.3 and passes the sandbox check, and all seven consumer modules pass their own `go test ./...` suites plus `go vet ./...` under the new line, with clean working trees.

## Status

Adopted and merged. The consumers still run their own suites before their next deployment; that follow-through belongs to their owners.
