# Evidence

The operator approved pnpm 11.28.12's registry-placeholder and pnpr compatibility changes and Obscura 0.2.7's CDP same-origin acceptance. The [pnpm release](https://github.com/pnpm/pnpm/releases/tag/v11.28.12) describes the changes. Its [registry fallback issue](https://github.com/pnpm/pnpm/issues/17762) and comparison file inventory were inspected. A disposable no-dependency project installed offline, and a repository `.npmrc` registry containing `${UNTRUSTED_REGISTRY}` failed instead of falling back. No remote pnpr server was available; compatibility with older servers is intentionally not claimed.

The [Obscura release](https://github.com/h4ckf0r0day/obscura/releases/tag/v0.2.7) lists security and behavior fixes. Source patches for [CDP origin policy](https://github.com/h4ckf0r0day/obscura/pull/1501) and [bootstrap removal](https://github.com/h4ckf0r0day/obscura/pull/1429) were inspected. The release asset's published SHA-256 is pinned and verified by the Dockerfile. An offline CDP handshake regression checks origin-free and same-origin clients are accepted while an unrelated origin is rejected. The sandbox browser CDP DOM evaluation passed. An isolated loopback server was denied without the private-network option and reachable with it.

The rebuilt sandbox passed its offline image check as UID 1000, documentation checker, nine tests and strict validation. Native desktop browser acceptance was not tested.

Sandbox CI `43889841617` and documentation CI `43889841570` passed on `1ae400d`. Published sandbox `latest` resolved to `sha256:e095d27d99356d487faa5cc281c3843760c699b0b2604bc68aaea7f772ad78de` with the expected revision label. The sandbox service pulled it and reported pnpm 11.28.12, Obscura 0.2.7 and the expected browser text.
