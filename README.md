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

Deployment has a separate external-backend prerequisite. OpenChamber `2.1.0` requires OpenCode **2.x, at least `2.0.20`**, according to its [versioned compatibility contract](https://github.com/openchamber/openchamber/blob/v2.1.0/packages/web/server/lib/opencode/compatibility.js). On 2026-10-04 the running host-native backend was still `2.0.16`, despite an installed `2.0.22` CLI; frontend cutover was deferred and services were left unchanged. Image build, digest, origin, and an HTTP `200` health response do not establish compatibility with that running backend. Publishing `latest` or changing a Compose reference neither upgrades the native service nor authorizes deployment against an incompatible backend.

## Automatic release builds

The single [workflow](.github/workflows/build.yml) has two independent paths:

- A `main` push affecting `plugins/**`, release automation scripts, or the workflow tests the release contracts and bundles the plugin with Bun `1.4.2`. It uploads a private Actions artifact with the bundle, portable SHA-256 checksum, source commit metadata, and applicable notices for 30 days. It leaves `main: ./index.ts` unchanged and does not publish an npm package or alter host registration.
- The hourly `17 * * * *` schedule and manual dispatch fully paginate upstream GitHub releases. GitHub Actions cannot subscribe directly to another repository's release event, so polling can be delayed by the scheduler. Every non-draft release published at or after `2026-09-24T19:14:25Z` (the `v2.0.1` publication, inclusive) is considered, including prereleases with an uploaded `openchamber-web-VERSION.tgz` asset. Missing or uploading assets remain pending and are revisited without a date high-water mark.

The immutable completion identity is the single tag `ghcr.io/miloszkolber/openchamber:VERSION-rRELEASEID`, for example `2.0.1-r395994070`. A version reused under another release ID is a different build. A separate job promotes the newest eligible stable release to the mutable private `ghcr.io/miloszkolber/openchamber:latest` alias; matrix jobs never write that alias. There is no state commit, deployment, PR publication, PAT secret, or self-hosted runner. The fully scanned backlog must fit GitHub's 256-job matrix limit or discovery fails explicitly; it never truncates silently. Jobs run at most two image builds in parallel, keep other releases running after one fails, use bounded timeouts, and serialize the same release ID across scheduled and manual runs without cancelling an active build.

Discovery uses `GITHUB_TOKEN` with `contents: read` and `packages: read`; only image and latest-promotion jobs get `packages: write`. Only a manifest `404` after successful GHCR pull-scope authentication counts as an absent image. Authentication, authorization, API, and transport errors fail discovery rather than masquerade as absence. Each image job rechecks the release/digest and completion tag, builds, tests version/CLI/layout/syntax/update guards/non-root/Git/shell in a network-disabled container, then pushes. CI independently checks the build repository and package are private, before using an existing package and after publication. After pushing, it authenticates a lookup of that exact canonical tag and requires its registry manifest digest to equal the digest reported by the push; Docker's local image/config ID is not a manifest digest. It then pulls that digest without starting it and verifies its OCI source, build commit, version, and upstream release ID against the checked build. Actions are pinned to official release commit SHAs verified on 2026-10-04.

The observed GHCR Packages REST response omits `repository`, despite a correct OCI source label and working repository-token read/write access. Missing metadata does not establish a wrong repository link, so it is not an association gate. Explicit contradictory linkage is rejected if returned. Package privacy, repository privacy, registry digest identity, and published image origin are verified; the connected-repository display in GitHub's package UI is not attested by these checks. No PAT or package-settings change is needed for the verified build path.

### Stable latest promotion

Normal hourly polls and manual dispatches on `main` promote `latest` after discovery succeeds and the image matrix succeeds, or after a zero-build discovery skips that matrix. Bootstrap and read-only verification recovery never promote. A manual `release_id` restricts only the build matrix, not latest selection. The 15-minute promotion job uses one constant `openchamber-latest` concurrency group without cancelling an active job. It fully paginates upstream again after acquiring that group, so an older queued workflow does not carry an old discovery winner into publication. This group serializes this pipeline's writers only; the OCI registry does not provide a compare-and-swap guarantee against outside writers.

The winner is the highest eligible stable SemVer using arbitrary-precision numeric major/minor/patch comparison, then publication timestamp and numeric release ID for ties. It must satisfy the same inclusive baseline, non-draft, and uploaded web-asset contract as a build candidate, have `prerelease: false`, and have no SemVer suffix. Prereleases still build under their immutable tags. Missing or uploading assets remain pending for later polls. Selection happens before image availability: if the winning canonical tag is missing, the job reports `waiting` and retains the current alias instead of falling back to an older image.

The two-phase `scripts/latest-release.mjs candidate|promote` CLI revalidates staged action outputs before use. The runner logs into GHCR with `GITHUB_TOKEN`, pulls the candidate by its exact registry digest with a three-minute bound, and reads only `.Config.Labels` into a bounded temporary file without starting an image. A different existing alias is inspected the same way. Source must identify this private repository; version and upstream release ID must match a retained stable release; the 40-character revision must resolve through this private repository's GitHub API. That revision is the retained publishing commit, not the current promotion run's `GITHUB_SHA`. An existing alias must also equal its retained canonical tag's digest, and a newer current alias cannot be downgraded. An equal candidate/alias digest is a verified `unchanged` result with no PUT.

Promotion downloads the canonical manifest or index by digest through the authenticated OCI API, refuses redirects, and bounds each request to 20 seconds and manifest bytes to 4 MiB. It checks header digest, SHA-256 of the bytes, supported media identity, and basic JSON shape, then PUTs those **exact original bytes**, content type, and byte count only to `latest`. It does not locally retag/push or reconstruct an index with Buildx, so whitespace, child manifests, and attestations are preserved. Immediately before PUT it rechecks privacy, fully reselects upstream, refetches the selected release/asset digest, and requires canonical/current-alias HEAD results to match the staged observations. Drift fails for fresh discovery on a later poll, not a cached retry.

After PUT, authenticated HEAD results must show both `latest` and its canonical tag equal the selected digest, and package/repository privacy must still pass. A failed or timed-out PUT may have been accepted: one latest readback reconciles an expected digest as `published-reconciled`; other states fail as `uncertain`, without an automatic restore or replay. An expected alias readback followed by failed canonical/privacy verification is `published-unverified`, not an absent image or a successful promotion. Subsequent polls start fresh and are idempotent. Machine outputs and the Actions summary record outcome, selected release, digest, previous alias digest, and retained publisher, including failure states with a nonzero exit status. Deployment remains manual with Watchtower disabled; using the private `latest` reference in host Compose does not change these publication checks or the separate backend-compatibility prerequisite.

Docker authentication/setup failures also record `failed`, preserve the selected observations, and state that manifest PUT was not attempted. The caller retains the original nonzero setup status and cleans only its task-owned credential directory. The internal `setup-failed` command reports this boundary without requiring working Docker or registry credentials; it does not publish an image.

### First-package bootstrap

A genuinely empty GHCR package can refuse to grant pull scope before its first push. After checking the package is not already populated, an operator can authorize only the initial `2.0.1` seed:

```sh
gh workflow run build.yml -f bootstrap=true -f release_id=395994070
# Once the seed and CI's privacy, digest, and origin checks succeed:
gh workflow run build.yml
```

The `release_id` argument is optional; bootstrap always selects `395994070`. The bypass is allowed only for an explicit bootstrap, an unavailable (`404`) package metadata record, and GHCR pull-token `401`/`403`. That combination is not proof of an empty package: the operator's explicit seed authorization supplies the decision. Existing verified packages, metadata `401`/`403`, transport failures, non-seed release IDs, and ordinary polls cannot use the bypass. A normal poll after the seed catches up the other releases. The initial known backlog is `2.0.1` (`395994070`), `2.0.2` (`397002711`), `2.0.3` (`397868365`), `2.0.4` (`398707683`), and `2.1.0` (`400565502`).

The first CI run must establish that `GITHUB_TOKEN` can read the package metadata and push a private package with the expected published image origin. Repository creation and a local OAuth login do not prove those package permissions; the local login may lack `read:packages`. If verification fails, stop and repair the demonstrated visibility, access, digest, or image-origin mismatch before rerunning; this repository does not change package settings or deploy a partially verified image.

### Verification recovery

A successful push followed by a verification error is a published image with incomplete verification, not a missing image. Ordinary discovery reconciles existing tags without overwriting them. To repeat the full read-only privacy, digest, and origin checks, copy the digest from that successful push and the original publishing commit from its run, then dispatch:

```sh
gh workflow run build.yml -f release_id=395994070 \
  -f verify_digest=sha256:RECORDED_PUSH_DIGEST -f source_commit=ORIGINAL_PUBLISHING_COMMIT
```

Replace the placeholders with the full 64-character digest and 40-character commit. This mode uses only package-read permission, skips discovery/build/publication, resolves the retained upstream release identity, pulls the exact digest on a disposable runner without starting it, and checks its origin against the original commit. It does not substitute current `main`'s commit, require a PAT, or suppress verification because the tag already exists.

## Checks and artifacts

```sh
node --test scripts/upstream-releases.test.mjs scripts/latest-release.test.mjs
# With Bun available but no local Node executable:
bun test scripts/upstream-releases.test.mjs scripts/latest-release.test.mjs
cd plugins/signet-opencode-v2
test -s bun.lock && bun install --frozen-lockfile && bun run test && bun run build
bun -e 'const {default:p}=await import("./dist/signet-opencode-v2.mjs"); if(p.id!=="signet.lifecycle" || typeof p.setup!=="function") throw new Error("Invalid plugin")'
```

The dependency-free fixtures retain the 13 discovery/publication/recovery contract tests and cover stable ordering (including huge numeric SemVer parts and ties), zero-build promotion, missing winners, stale runs, monotonic origin checks, drift before PUT, exact OCI index/manifest bytes, ambiguous publication reconciliation, bounded labels, and secret-safe redirect failures. They do not prove real registry permissions or external native-backend compatibility. Registry commands `discover`, `prepare`, `verify-package`, `verify-image`, `verify-release`, and latest `candidate`/`promote` use credentials only in `GITHUB_TOKEN`/`GITHUB_ACTOR`; dispatch inputs and staged outputs are revalidated and passed through quoted environment variables, not interpolated into shell programs. Latest `promote` consumes `LATEST_OUTCOME`, `LATEST_VERSION`, `LATEST_RELEASE_ID`, `LATEST_ASSET_SHA256`, `LATEST_PUBLISHED_AT`, `LATEST_DIGEST`, `LATEST_PREVIOUS_DIGEST`, and `LATEST_ALIAS_STATUS` from `candidate`; Docker login and `RUNNER_TEMP` are required for its bounded label inspection. `verify-image` requires `IMAGE` and the pushed registry `MANIFEST_DIGEST`, and rejects missing tags or mismatched digests even when package privacy is correct. The credential-free `verify-origin` command checks the JSON file named by `IMAGE_LABELS_FILE` against `RELEASE_VERSION`, `RELEASE_ID`, and `SOURCE_COMMIT`.

Download the plugin artifact from the private repository's Actions run. From its extracted directory, `sha256sum -c SHA256SUMS` verifies the bundle against its recorded checksum. The artifact is not a standalone OpenCode runtime: it retains an external `@opencode/plugin@2.0.16` import. CI imports the bundle with installed locked dependencies; it does not repeat the separate native OpenCode acceptance smoke, establish compatibility with newer OpenCode versions, or prove a final assistant-output sanitization guarantee. See the [plugin README](plugins/signet-opencode-v2/README.md) and [third-party attribution](THIRD_PARTY_NOTICES.md).

Authenticated artifact metadata and downloads use GitHub's [Actions artifacts REST API](https://docs.github.com/en/rest/actions/artifacts); uploaded artifact IDs/digests and expiry are distinct from the bundle's own checksum. Repository access and unexpired artifact retention are required.
