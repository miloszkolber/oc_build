# Refine Canvas visual language

## Why

Operator annotations identify decorative color, noisy chart textures and oversized
Mermaid graphics in the catalog. Matching tokens alone did not produce a native look.

## Scope

Adjust the shared renderer, not preview-only styling. Place metric changes at the
top right, strengthen headings, remove the callout stripe and use monochrome
ratings, choices, checklists, steps and timeline dots. Keep explicit status colors.
Use solid fills for the first chart ramp and sparse patterns only when fills repeat.
Keep Mermaid at intrinsic size, with neutral diagram surfaces and compact chart geometry.
Preserve the read-only surface, catalog and rendering lifecycle.

## What Changes

- Renderer: top-right metric changes, stronger headings, uniform callout borders,
  monochrome ordinary marks, single-measure bars in one solid accent, sparse
  patterns only for repeated fills, restrained technical Mermaid styling with a
  separate quiet pie palette (deltas in `specs/canvas-panel/spec.md`).
- Release: approved source installed as Canvas 0.9.16.
- Guidance: shared workspace module covers authoring, interaction and justified
  chart color; not a spec change and owned by `/home/core/agents`.

## Status

Implementation and visual verification complete. Operator grants visual and native
approval on 2026-10-11, with chart color permitted when justified. Agent guidance
now covers the approved authoring and interaction contract. A versioned release/install and exact
upgraded asset parity remain separate work, not implied by approval.
