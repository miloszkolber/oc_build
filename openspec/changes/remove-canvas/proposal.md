# Remove the Canvas integration

## Why

The operator requested removal of the repository's generative Canvas integration and its files. The panel is not installed on the host. This change does not recreate or delete host data.

## What changes

Remove the Canvas extension, its package workflow and Dependabot directory, the repository's Canvas workspace guidance and the implemented panel capability. Update the release-pipeline requirements and navigation to describe only retained deliverables. Close Canvas-only dependency pull requests as obsolete after removal rather than merging changes to a deleted package.

## Scope

The app, standalone browser MCP, sandbox and Rembric remain. The HTML Canvas API and CSS system colors used by the browser are unrelated and stay. Historical change records remain history. Shared host agent guidance and scheduled maintenance instructions have separate owners and require coordinated updates.
