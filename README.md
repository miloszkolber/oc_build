# OpenChamber build inputs

Private build repository for `miloszkolber/openchamber`. `assets/` contains the complete local OpenChamber image inputs; `plugins/signet-opencode-v2/` contains the source-loaded Signet lifecycle port and its locked dependencies. Neither host configuration nor secrets belong here. The plugin runs in the external OpenCode process, not in the OpenChamber frontend image.

## Local builds

Build from the repository root so the existing `COPY assets/...` paths remain valid. The default is OpenChamber `2.0.1`, using Debian Bookworm's Node 22 slim image with Git and a POSIX shell. Self-updates are disabled; updates require a new image. An upstream layout or patch mismatch fails the build instead of publishing an unguarded updater.

```sh
docker build -f assets/Dockerfile -t openchamber:2.0.1 .
# Explicit compatibility pin for the previously deployed version:
docker build -f assets/Dockerfile --build-arg OPENCHAMBER_VERSION=2.0.0 -t openchamber:2.0.0 .
# Check an isolated image without contacting either service:
timeout 180 docker run --rm --interactive --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --tmpfs /tmp --env EXPECTED_VERSION=2.0.1 \
  --entrypoint node openchamber:2.0.1 --input-type=module < scripts/check-image.mjs
```

`OPENCHAMBER_ASSET_SHA256` optionally accepts the release asset's 64-character lowercase SHA-256. CI validates GitHub's `sha256:...` digest and passes it when available; the build verifies the download before extraction. An absent upstream digest is reported as absent, not as verified. Exact release/version identity does not make image bits reproducible: base images, apt packages, npm itself, and unpinned production dependency resolutions remain mutable. The legacy local `OPENCHAMBER_VERSION=latest` override still resolves at build time; CI never uses it.

At the 2026-10-04 migration snapshot, the host still ran OpenChamber `2.0.0`; `2.0.1` was the prepared default. Moving these files or publishing an image does not change that deployment. Host Compose and OpenCode plugin registration are managed outside this repository.

## Automatic release builds

The single [workflow](.github/workflows/build.yml) has two independent paths:

- A `main` push affecting `plugins/**` or the workflow tests and bundles the plugin with Bun `1.4.2`. It uploads a private Actions artifact with the bundle, portable SHA-256 checksum, source commit metadata, and applicable notices for 30 days. It leaves `main: ./index.ts` unchanged and does not publish an npm package or alter host registration.
- The hourly `17 * * * *` schedule and manual dispatch fully paginate upstream GitHub releases. GitHub Actions cannot subscribe directly to another repository's release event, so polling can be delayed by the scheduler. Every non-draft release published at or after `2026-09-24T19:14:25Z` (the `v2.0.1` publication, inclusive) is considered, including prereleases with an uploaded `openchamber-web-VERSION.tgz` asset. Missing or uploading assets remain pending and are revisited without a date high-water mark.

The completion identity is the single tag `ghcr.io/miloszkolber/openchamber:VERSION-rRELEASEID`, for example `2.0.1-r395994070`. A version reused under another release ID is a different build. There is no mutable `latest` tag, state commit, deployment, PR publication, PAT secret, or self-hosted runner. The fully scanned backlog must fit GitHub's 256-job matrix limit or discovery fails explicitly; it never truncates silently. Jobs run at most two image builds in parallel, keep other releases running after one fails, use bounded timeouts, and serialize the same release ID across scheduled and manual runs without cancelling an active build.

Discovery uses `GITHUB_TOKEN` with `contents: read` and `packages: read`; only image jobs get `packages: write`. Only a manifest `404` after successful GHCR pull-scope authentication counts as an absent image. Authentication, authorization, API, and transport errors fail discovery rather than masquerade as absence. Each image job rechecks the release/digest and completion tag, builds, tests version/CLI/layout/syntax/update guards/non-root/Git/shell in a network-disabled container, then pushes. CI independently checks the build repository and package are private, before using an existing package and after publication. After pushing, it authenticates a lookup of that exact canonical tag and requires its registry manifest digest to equal the digest reported by the push; Docker's local image/config ID is not a manifest digest. It then pulls that digest without starting it and verifies its OCI source, build commit, version, and upstream release ID against the checked build. Actions are pinned to official release commit SHAs verified on 2026-10-04.

The observed GHCR Packages REST response omits `repository`, despite a correct OCI source label and working repository-token read/write access. Missing metadata does not establish a wrong repository link, so it is not an association gate. Explicit contradictory linkage is rejected if returned. Package privacy, repository privacy, registry digest identity, and published image origin are verified; the connected-repository display in GitHub's package UI is not attested by these checks. No PAT or package-settings change is needed for the verified build path.

### First-package bootstrap

A genuinely empty GHCR package can refuse to grant pull scope before its first push. After checking the package is not already populated, an operator can authorize only the initial `2.0.1` seed:

```sh
gh workflow run build.yml -f bootstrap=true -f release_id=395994070
# Once the seed and CI's privacy, digest, and origin checks succeed:
gh workflow run build.yml
```

The `release_id` argument is optional; bootstrap always selects `395994070`. The bypass is allowed only for an explicit bootstrap, an unavailable (`404`) package metadata record, and GHCR pull-token `401`/`403`. That combination is not proof of an empty package: the operator's explicit seed authorization supplies the decision. Existing verified packages, metadata `401`/`403`, transport failures, non-seed release IDs, and ordinary polls cannot use the bypass. A normal poll after the seed catches up the other releases. The initial known backlog is `2.0.1` (`395994070`), `2.0.2` (`397002711`), `2.0.3` (`397868365`), `2.0.4` (`398707683`), and `2.1.0` (`400565502`).

The first CI run must establish that `GITHUB_TOKEN` can read the package metadata and push a private package with the expected published image origin. Repository creation and a local OAuth login do not prove those package permissions; the local login may lack `read:packages`. If verification fails, stop and repair the demonstrated visibility, access, digest, or image-origin mismatch before rerunning; this repository does not change package settings or deploy a partially verified image.

## Checks and artifacts

```sh
node --test scripts/upstream-releases.test.mjs
# With Bun available but no local Node executable:
bun test scripts/upstream-releases.test.mjs
cd plugins/signet-opencode-v2
test -s bun.lock && bun install --frozen-lockfile && bun run test && bun run build
bun -e 'const {default:p}=await import("./dist/signet-opencode-v2.mjs"); if(p.id!=="signet.lifecycle" || typeof p.setup!=="function") throw new Error("Invalid plugin")'
```

The dependency-free discovery fixtures check GitHub pagination, late assets, prereleases, completed identities, strict digest/field validation, GHCR failures, bootstrap bounds, independent package/repository privacy, optional linkage metadata, post-publication digest and origin identity, and the matrix limit. They do not prove real registry permissions. Registry commands `discover`, `prepare`, `verify-package`, and `verify-image` use credentials only in `GITHUB_TOKEN`/`GITHUB_ACTOR`; dispatch inputs and discovery outputs are revalidated and passed through quoted environment variables, not interpolated into shell programs. `verify-image` requires `IMAGE` and the pushed registry `MANIFEST_DIGEST`, and rejects missing tags or mismatched digests even when package privacy is correct. The credential-free `verify-origin` command checks the JSON file named by `IMAGE_LABELS_FILE` against `RELEASE_VERSION`, `RELEASE_ID`, and `SOURCE_COMMIT`.

Download the plugin artifact from the private repository's Actions run. From its extracted directory, `sha256sum -c SHA256SUMS` verifies the bundle against its recorded checksum. The artifact is not a standalone OpenCode runtime: it retains an external `@opencode/plugin@2.0.16` import. CI imports the bundle with installed locked dependencies; it does not repeat the separate native OpenCode acceptance smoke, establish compatibility with newer OpenCode versions, or prove a final assistant-output sanitization guarantee. See the [plugin README](plugins/signet-opencode-v2/README.md) and [third-party attribution](THIRD_PARTY_NOTICES.md).

Authenticated artifact metadata and downloads use GitHub's [Actions artifacts REST API](https://docs.github.com/en/rest/actions/artifacts); uploaded artifact IDs/digests and expiry are distinct from the bundle's own checksum. Repository access and unexpired artifact retention are required.
