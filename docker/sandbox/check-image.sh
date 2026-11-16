#!/usr/bin/env bash
# Verifies the sandbox image contains the pinned toolchains and cache wiring.
set -euo pipefail

fail() {
    echo "sandbox image check FAILED: $*" >&2
    exit 1
}

for tool in bash git rg jq curl make gcc g++ pkg-config ssh flock \
    python3 bun node npm pnpm go rustc cargo rustup uv uvx file unzip patch openspec \
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
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
printf 'fn main() { println!("cargo-ok"); }\n' > "$work/main.rs"
rustc "$work/main.rs" -o "$work/check"
[ "$("$work/check")" = cargo-ok ] || fail "rustc execution"
mkdir "$work/project"
printf '[package]\nname="sandbox-check"\nversion="0.1.0"\nedition="2021"\n' > "$work/project/Cargo.toml"
mkdir "$work/project/src"
cp "$work/main.rs" "$work/project/src/main.rs"
(cd "$work/project" && cargo build --offline --quiet) || fail "cargo offline build"
[ "$("$work/project/target/debug/sandbox-check")" = cargo-ok ] || fail "cargo execution"

OPENSPEC_TELEMETRY=0 openspec --version | grep -qx '2.0.0' || fail "OpenSpec version"
pnpm --version | grep -qx '11.28.11' || fail "pnpm version"
uv --version | grep -qE '^uv 0\.13\.8( |$)' || fail "uv version"
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
[ "$CARGO_HOME" = /cache/cargo ] || fail "CARGO_HOME env"
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
printf 'rustc   %s\n' "$(rustc --version)"
printf 'cargo   %s\n' "$(cargo --version)"
printf 'node    %s\n' "$(node --version)"
printf 'npm     %s\n' "$(npm --version)"
printf 'pnpm    %s\n' "$(pnpm --version)"
printf 'python  %s\n' "$(python3 --version | awk '{print $2}')"
printf 'uv      %s\n' "$(uv --version | awk '{print $2}')"
printf 'obscura %s\n' "$(obscura --version | awk '{print $2}')"
echo "sandbox image check OK"
