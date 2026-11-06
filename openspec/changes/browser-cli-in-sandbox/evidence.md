# Evidence

## Image

Rebuilt `docker/sandbox` and ran `check-image.sh` as UID 1000 under `--network none`; it passed. The inventory reports Obscura 0.2.6 and playwright-core 1.65.0. The image is 460,183,015 bytes versus 383,339,459 for the previous sandbox — the increase is the Obscura binary pair.

Offline smoke checks in the check script:

- `obscura fetch 'data:text/html,<h1>obscura-ok</h1>' --dump text` prints `obscura-ok`.
- `obscura fetch … --screenshot` writes a nonempty PNG.
- `browser text` prints the same text through the Obscura CDP endpoint.
- `browser shot` writes a nonempty PNG.
- `playwright-core` imports.

Additional probes: `browser pdf` wrote a PDF; `browser script` ran a module against a `data:` page; `obscura scrape --help` exists. A loopback HTTP target was refused without `--allow-private-network` and returned its page with the flag. The `--allow-file-access` flag enables `file://` navigation.

## Removals

`docker/browser/`, `.github/workflows/browser.yml`, `extensions/`, and the browser-MCP/Rembric capability specs were removed. The Build workflow no longer has the plugin job and runs release/latest/entrypoint tests in discovery. Dependabot now tracks only root Actions.
