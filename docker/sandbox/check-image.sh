#!/usr/bin/env bash
# Verifies the sandbox image contains the pinned toolchains and cache wiring.
set -euo pipefail

fail() {
    echo "sandbox image check FAILED: $*" >&2
    exit 1
}

for tool in bash git rg jq curl make gcc g++ pkg-config ssh flock \
    python3 bun node npm pnpm go uv uvx file unzip patch openspec \
    obscura obscura-worker browser; do
    command -v "$tool" >/dev/null 2>&1 || fail "missing $tool"
done

# The sandbox provides dev toolchains only. Container-build tooling is out of
# scope, so its absence is asserted rather than tolerated.
for absent in docker podman buildx; do
    command -v "$absent" >/dev/null 2>&1 && fail "container tooling must not ship: $absent"
done

major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$major" -ge 22 ] || fail "node < 22 ($(node --version))"

go version | grep -qE 'go1\.2[5-9]' || fail "unexpected go ($(go version))"
gofmt -h >/dev/null 2>&1 || fail "gofmt missing"

OPENSPEC_TELEMETRY=0 openspec --version | grep -qx '1.16.0' || fail "OpenSpec version"
pnpm --version | grep -qx '11.28.10' || fail "pnpm version"
uv --version | grep -qE '^uv 0\.13\.6( |$)' || fail "uv version"
obscura --version | grep -qx 'obscura 0.2.6' || fail "Obscura version"

# Headless browser smoke test: native fetch/screenshot and the CDP CLI, offline.
fixture='data:text/html,<h1>obscura-ok</h1>'
[ "$(obscura fetch "$fixture" --dump text --timeout 10 | tail -1)" = obscura-ok ] || fail "obscura fetch"
obscura fetch "$fixture" --screenshot /tmp/obscura-check.png --timeout 10 >/dev/null 2>&1 || fail "obscura screenshot"
[ -s /tmp/obscura-check.png ] || fail "obscura screenshot output"
[ "$(browser text "$fixture")" = obscura-ok ] || fail "browser text"
browser shot "$fixture" /tmp/browser-check.png >/dev/null 2>&1 || fail "browser shot"
[ -s /tmp/browser-check.png ] || fail "browser screenshot output"
(cd /opt/browser && node -e "import('playwright-core').then(()=>console.log('playwright-core ok')).catch(e=>{console.error(e);process.exit(1)})") | grep -qx 'playwright-core ok' || fail "playwright-core import"
rm -f /tmp/obscura-check.png /tmp/browser-check.png

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
printf 'obscura %s\n' "$(obscura --version | awk '{print $2}')"
echo "sandbox image check OK"
