# Evidence

The Android service was already absent from the deployment configuration and no matching container was present. Removed the repository-owned Android image source and workflow, the local image tag, and obsolete deployment and dashboard references. Android state, backups, the separate product-owned image and its viewer route were preserved.

The sandbox was rebuilt locally with the pinned Rust image index `sha256:ade39a710ef85f3506cffcfec3e8a24ba090badef1dff2fb798f71d878833fea`. As UID 1000 with no network, the image check passed native Rust compilation and an offline Cargo build, including execution of both outputs. Resolved tool versions are Rust 1.100.0 and Cargo 1.100.0. This is a local image check, not publication or deployment.

The documentation checker, nine checker tests and strict OpenSpec validation passed after archive. Publication remains separate.
