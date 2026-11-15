## MODIFIED Requirements

### Requirement: Persistent dependency caches
The image SHALL direct Bun, npm, pnpm, Go, Cargo and uv dependency caches into /cache. Project dependency trees and authored outputs SHALL remain project-owned. The sandbox SHALL NOT own Docker or BuildKit caches.

#### Scenario: Repeated build
- **WHEN** a second run builds the same locked project
- **THEN** the dependency caches from the first run remain available
- **AND** each run has independent temporary state.

## ADDED Requirements

### Requirement: Rust development toolchain
The sandbox SHALL provide Rust and Cargo for native builds without installing tools on the host.

#### Scenario: Offline compilation
- **WHEN** the image is checked without network access
- **THEN** Rust and Cargo compile and execute a small native program.
