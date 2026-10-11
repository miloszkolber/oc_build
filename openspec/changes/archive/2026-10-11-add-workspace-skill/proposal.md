# Add the workspace skill

## Why

The workspace skill documents the OpenChamber in-app surfaces this repository
builds: the Canvas panel, browser evidence and the agent development sandbox.
Keeping it inside the repository lets the guidance be versioned, reviewed and
link-checked with the code that implements those surfaces.

## What Changes

Add `skill/` as repository content: the `SKILL.md` entry, a maintainer
`README.md` and the `references/` modules for Canvas, browser and sandbox. List
`skill/` in the root [README](../../../README.md) layout and include its Markdown
in the documentation check so its links stay valid. No capability requirement
changes; this is a documentation and repository-layout change.

## Status

Implemented and locally verified. No publication, deployment or service restart
is authorized here.
