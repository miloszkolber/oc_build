# Tasks

## 1. Branch change

- [x] 1.1 Copy Go from `golang:1.27-bookworm` in `docker/sandbox/Dockerfile` and record Go 1.27 in the sandbox README. Verified by: the rebuilt image reports `go1.27.3` and the image check passes.
- [x] 1.2 Confirm `check-image.sh` accepts the new line without weakening it. Verified by: the existing `go1\.2[5-9]` assertion passes for 1.27.3.

## 2. Consumer evidence

- [x] 2.1 Run every consumer module's own test suite with the rebuilt image. Verified by: `go test ./... -count=1` results per module in [evidence.md](evidence.md).
- [x] 2.2 Run `go vet ./...` for every consumer module under the new line. Verified by: exit 0 for all seven.
- [x] 2.3 Confirm the test runs left the consumer working trees clean. Verified by: `git status --porcelain` empty in each module.

## 3. Decision and close

- [x] 3.1 Operator chose the latest supported line (1.27) on 2026-10-26.
- [x] 3.2 Merge, let the image workflow rebuild and republish the sandbox image, and verify the published bytes. Verified by: hosted CI result, the published digest and `go version` in the published image.
- [ ] 3.3 Each consumer repository runs its own suite and checks under the new sandbox line before its next deployment. Owners' follow-through; the suites already pass here in the same image.
