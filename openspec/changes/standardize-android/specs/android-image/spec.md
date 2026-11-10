## ADDED Requirements

### Requirement: Self-contained Android development image
The Android development image SHALL provide the selected SDK, JDK, emulator and viewer, and SHALL package the lifecycle controller without requiring a host-mounted controller script.

#### Scenario: Explicit SDK agreement
- **WHEN** the image is built without explicit acceptance of the required Android SDK agreement
- **THEN** the build fails before downloading the SDK
- **AND** no SDK-bearing image is published without separate redistribution review

#### Scenario: Development container starts
- **WHEN** the container starts with persistent writable state and an available controller socket
- **THEN** the non-root SDK container remains available
- **AND** the emulator does not start automatically

### Requirement: On-demand emulator lifecycle
The image SHALL support serialized on-demand start and stop of the existing emulator profiles, preserve the AVD data and stop the emulator after the configured viewer-idle interval without stopping the development container.

#### Scenario: Start and readiness
- **WHEN** the caller requests start with KVM and a supported profile
- **THEN** the viewer and emulator start using the existing profile and AVD paths
- **AND** guest boot and viewer readiness are checked separately from the start request

#### Scenario: Idle and shutdown
- **WHEN** no viewer is connected for the configured interval
- **THEN** the emulator is stopped without stopping the development container
- **AND** shutdown attempts guest sync and emulator exit before terminating viewer processes
- **AND** failed viewer inspection keeps the emulator running
