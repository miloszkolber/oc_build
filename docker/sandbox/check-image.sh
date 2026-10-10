#!/usr/bin/env bash
# Verifies the sandbox image contains the pinned toolchains and cache wiring.
set -euo pipefail

fail() {
    echo "sandbox image check FAILED: $*" >&2
    exit 1
}

for tool in bash git rg jq curl make gcc g++ pkg-config ssh \
    python3 bun node npm pnpm go uv uvx docker file unzip patch; do
    command -v "$tool" >/dev/null 2>&1 || fail "missing $tool"
done

major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$major" -ge 22 ] || fail "node < 22 ($(node --version))"

go version | grep -qE 'go1\.2[5-9]' || fail "unexpected go ($(go version))"
gofmt -h >/dev/null 2>&1 || fail "gofmt missing"

docker compose version >/dev/null 2>&1 || fail "docker compose plugin missing"
docker buildx version >/dev/null 2>&1 || fail "docker buildx plugin missing"

[ "$BUN_INSTALL_CACHE_DIR" = /cache/bun ] || fail "bun cache env"
[ "$GOMODCACHE" = /cache/go/mod ] || fail "GOMODCACHE env"
[ "$GOCACHE" = /cache/go/build ] || fail "GOCACHE env"
[ "$UV_CACHE_DIR" = /cache/uv ] || fail "UV_CACHE_DIR env"
[ "$GOTOOLCHAIN" = local ] || fail "GOTOOLCHAIN must be local"
[ "$(npm config get cache)" = /cache/npm ] || fail "npm cache not in /cache"
case "$(pnpm store path)" in
    /cache/pnpm-store/*) ;;
    *) fail "pnpm store not in /cache: $(pnpm store path)" ;;
esac

mkdir -p "$HOME"
printf 'bun     %s\n' "$(bun --version)"
printf 'go      %s\n' "$(go version | awk '{print $3}')"
printf 'node    %s\n' "$(node --version)"
printf 'npm     %s\n' "$(npm --version)"
printf 'pnpm    %s\n' "$(pnpm --version)"
printf 'python  %s\n' "$(python3 --version | awk '{print $2}')"
printf 'uv      %s\n' "$(uv --version | awk '{print $2}')"
printf 'docker  %s\n' "$(docker --version | awk '{print $3}' | tr -d ,)"
echo "sandbox image check OK"
