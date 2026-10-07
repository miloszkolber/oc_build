#!/bin/sh
# Build the standalone Rembric plugin bundle and install it into OpenCode's
# global plugin directory, where OpenCode discovers it automatically.
#
# Usage: sh install.sh [plugin-dir]
#   plugin-dir defaults to $XDG_CONFIG_HOME/opencode/plugins (or ~/.config/...).
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
dest=${1:-"${XDG_CONFIG_HOME:-$HOME/.config}/opencode/plugins"}

command -v bun >/dev/null 2>&1 || {
	echo "install.sh: bun is required to build the plugin" >&2
	exit 1
}

bun build "$here/index.ts" --target bun --format esm --outfile "$here/dist/rembric.js"

mkdir -p "$dest"
cp "$here/dist/rembric.js" "$dest/rembric.js"
cp "$here/NOTICE" "$dest/rembric.NOTICE"

echo "installed $dest/rembric.js"
