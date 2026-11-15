# Retire Android image and add Rust

## Why

The operator requested removal of the Android image and Rust/Cargo support in the agent sandbox.

## What Changes

Remove Android image source and its workflow. Preserve existing Android user data and unrelated project images. Add a pinned upstream Rust toolchain, persistent Cargo cache and offline compile checks to the sandbox.
