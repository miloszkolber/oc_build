## MODIFIED Requirements

### Requirement: Scoped workflow triggers
Workflows SHALL build only their configured deliverables for relevant source changes.

#### Scenario: Trigger matrix
- **WHEN** workflow events are evaluated
- **THEN** the following configured behavior applies

| Workflow | Source trigger | Schedule (UTC) | Artifact |
| --- | --- | --- | --- |
| Build | `main` pushes matching app paths | Hourly `:17`, Monday `04:37` | App image |
| Sandbox | Matching pushes to `main` and pull requests | Monday `04:23` | Checked sandbox image; pull requests do not publish |
| Documentation contracts | Matching pushes to `main` and pull requests | None | Local checker/tests and upstream strict validation |

All three accept manual dispatch. The app workflow has no pull-request trigger; do not infer pre-merge coverage for its dependency updates.

### Requirement: Scoped dependency monitoring
Dependabot SHALL propose weekly Actions updates for its configured directories.

#### Scenario: Update scope
- **WHEN** Dependabot evaluates configuration
- **THEN** it covers root Actions (ten)
- **AND** package dependencies remain exactly pinned
- **AND** Docker base-version bumps are not covered by this configuration

Image builds resolve mutable base/package inputs and are not bit-reproducible. Record source revision and deployed digests for recovery. Publication alone is not rollout, native-client acceptance or a passing host integration check.

## REMOVED Requirements

### Requirement: Independent browser publication
**Reason**: The browser image is removed; browser tooling ships inside the sandbox image.
**Migration**: Use the sandbox browser CLI.

### Requirement: Checked plugin artifacts
**Reason**: The local Rembric plugin is removed; upstream mainline provides it.
**Migration**: Install the mainline Rembric plugin from upstream.
