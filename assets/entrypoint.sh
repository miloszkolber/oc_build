#!/bin/sh
# Minimal launcher: the web bundle is baked into the image, so there is
# nothing to install or self-update here. Wait for the native OpenCode
# server, then take over as the foreground web process.
set -eu

readonly cli="/opt/openchamber/bin/cli.js"

i=0
while ! node -e '
const headers = { Accept: "application/json" };
const password = process.env.OPENCODE_SERVER_PASSWORD;
if (password) {
  const username = process.env.OPENCODE_SERVER_USERNAME || "opencode";
  headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}
fetch("http://127.0.0.1:4096/api/info", { headers })
  .then(async (response) => {
    const info = await response.json().catch(() => null);
    process.exit(response.ok && typeof info?.version === "string" ? 0 : 1);
  })
  .catch(() => process.exit(1));
'; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
        echo "[openchamber] OpenCode server did not become ready" >&2
        exit 1
    fi
    sleep 1
done

exec node "$cli" serve --foreground --host "${OPENCHAMBER_HOST:-0.0.0.0}" --port "${OPENCHAMBER_PORT:-4098}"
