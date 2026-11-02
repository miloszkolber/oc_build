## MODIFIED Requirements

### Requirement: Scoped workflow triggers
Workflows SHALL build only their configured deliverables for relevant source changes.

#### Scenario: Trigger matrix
- **WHEN** workflow events are evaluated
- **THEN** the following configured behavior applies

| Workflow | Source trigger | Schedule (UTC) | Artifact |
| --- | --- | --- | --- |
| Build | `main` pushes matching app/Rembric paths | Hourly `:17`, Monday `04:37` | App image and push-only plugin artifact |
| Browser | `main` pushes matching browser paths | Monday `04:37` | Browser image |
| Sandbox | Matching pushes to `main` and pull requests | Monday `04:23` | Checked sandbox image; pull requests do not publish |
| Documentation contracts | Matching pushes to `main` and pull requests | None | Local checker/tests and upstream strict validation |

All four accept manual dispatch. App/browser workflows have no pull-request trigger. Do not infer pre-merge coverage for their dependency updates.

### Requirement: Scoped dependency monitoring
Dependabot SHALL propose weekly Bun and Actions updates for its configured directories.

#### Scenario: Update scope
- **WHEN** Dependabot evaluates configuration
- **THEN** it covers browser Bun dependencies (five open PRs) and root Actions (ten)
- **AND** package dependencies remain exactly pinned
- **AND** Docker base-version bumps are not covered by this configuration

Image builds resolve mutable base/package inputs and are not bit-reproducible. Record source revision and deployed digests for recovery. Publication alone is not rollout, native-client acceptance or a passing host integration check.


## REMOVED Requirements

### Requirement: Checked extension artifacts
**Reason**: The Canvas artifact is removed and the retained plugin contract is stated separately.
**Migration**: The Rembric artifact checks continue under Checked plugin artifacts.

## ADDED Requirements

### Requirement: Checked plugin artifacts
Rembric SHALL pass its declared local build contract before CI retains artifacts.

#### Scenario: Plugin package
- **WHEN** the push-only plugin job runs
- **THEN** release/latest/entrypoint checks and the plugin export contract run
- **AND** the commit-named plugin artifact includes digest/provenance and fails upload if files are absent

