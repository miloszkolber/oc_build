# Move headless browsing into the sandbox and drop the extension packages

## Why

The operator wants one sandbox package instead of a separate Chromium MCP image, with agents using a CLI rather than MCP tools. Obscura is a Rust headless browser with CDP support, a native CLI and a far smaller footprint than Chromium. The local Rembric extension is no longer needed because the upstream adapter was accepted into mainline.

## What changes

Remove `docker/browser/` and its workflow, image checks, MCP transport and Chromium closure. Remove `extensions/` entirely, including the Rembric V2 plugin and its build job. Add Obscura 0.2.6 and `playwright-core` 1.65.0 to the sandbox with a one-shot `browser` CLI for text, HTML, screenshots, PDF, evaluation and scripts. Keep the existing dev toolchains and cache layout; no extra service runs persistently.

## Impact

The published browser image and Rembric plugin artifact disappear. Host deployment must stop the browser MCP service and its MCP entry when the sandbox image is adopted. The sandbox grows by the Obscura binaries plus a small Node package. Private targets stay blocked unless `--allow-private-network` is explicit.
