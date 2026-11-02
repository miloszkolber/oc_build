# Keep canary metadata from blocking stable release discovery

## Why

Upstream introduced a rolling GitHub prerelease tagged `canary`, which has no versioned web tarball. Discovery currently requires every post-cutoff tag to begin with `v` and fails before reaching stable releases. Scheduled build runs therefore fail, and eligible stable releases are not published.

## What changes

Ignore only a release whose tag is exactly `canary` and whose prerelease flag is true. Continue validating all other releases and building eligible versioned prereleases. The rolling canary is not promoted or built. No permissions or deployment settings change.
