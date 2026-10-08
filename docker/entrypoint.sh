#!/bin/sh
# Waits for the external OpenCode server, then runs the baked web bundle.
# Nothing is installed or self-updated here.
set -eu

readonly cli="/opt/openchamber/bin/cli.js"
readonly target="${OPENCODE_HOST:-http://127.0.0.1:4096}"

i=0
while ! OPENCODE_PROBE="$target" node -e '
const base = process.env.OPENCODE_PROBE.replace(/\/+$/, "");
const headers = { Accept: "application/json" };
const password = process.env.OPENCODE_SERVER_PASSWORD;
if (password) {
  const username = process.env.OPENCODE_SERVER_USERNAME || "opencode";
  headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
fetch(`${base}/api/info`, { headers })
  .then(async (response) => {
    const info = await response.json().catch(() => null);
    process.exit(response.ok && typeof info?.version === "string" ? 0 : 1);
  })
  .catch(() => process.exit(1));
'; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
        echo "[openchamber] OpenCode server at ${target} did not become ready" >&2
        exit 1
    fi
    # Distroless runtime does not include coreutils; use the bundled Node
    # runtime for the retry delay instead of relying on an external sleep.
    node -e 'setTimeout(() => {}, 1000)'
done

exec node "$cli" serve --foreground --host "${OPENCHAMBER_HOST:-0.0.0.0}" --port "${OPENCHAMBER_PORT:-4098}"
