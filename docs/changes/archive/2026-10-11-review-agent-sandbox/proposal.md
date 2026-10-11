# Review agent sandbox

## Why

The delivered image and launcher need lifecycle, storage, adoption and release
review. The launcher inherits Docker context, age-only cleanup can delete active
runs, and build tools lack durable agent routing. The local image is no longer
present, so prior runtime claims do not establish current readiness.

## What changes

- Bind launcher execution explicitly to the host runtime, separate from the
  rootless build endpoint inside the container.
- Stop containers before removing scratch. Lock active runs against stale cleanup.
- Test launcher argument routing, status, signals and cleanup.
- Add the sandbox capability spec and workspace reference requiring future
  development tools to be recorded and built into the image instead of the host.
- Exercise real builds, cache reuse and CI-equivalent checks.

## Capabilities

- ADDED `agent-sandbox`: execution, lifecycle, caches and tool ownership.

## Scope and authority

User authorized review, fixes and workspace guidance. Preserve existing host
tools and live services. No native OpenCode migration, credential exposure,
automatic Docker image deletion or unrelated UI merge.

Status: implemented and locally reviewed. Hosted publication is a separate
integration gate. Rootless build access remains host-user access, not isolation.
