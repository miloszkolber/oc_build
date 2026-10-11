# Evidence

## Documentation check

`bun scripts/check-docs.mjs` — all Markdown files checked, 0 failures.

## Regression tests

`bun test scripts/check-docs.test.mjs` — all tests pass.

## Pinned OpenSpec validation

`OPENSPEC_TELEMETRY=0 bun x --bun @fission-ai/openspec@1.14.1 validate --all --strict`
— 0 failures.
