# Close Canvas review gaps

## Why

The latest repair still drops rating fractions outside 0.25–0.75 and repeats
the dense pattern pair at entries 6 and 11. Six-entry checks missed the
catalog's 30-entry limit. Mermaid retry has not been fault-injected.

## What changes

Render rating fills proportionally. Cycle six patterns against five fills so
all 30 allowed entries have unique pairs. Verify retry, cancellation and
installation parity. Preserve the read-only contract and existing styling.

## Status

Implementation, runtime review and documentation validation complete. Native
desktop acceptance remains a separate operator gate.
