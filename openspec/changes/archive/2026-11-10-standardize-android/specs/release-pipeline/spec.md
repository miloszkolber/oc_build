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
| Android image check | None | None | Manual build and checks only after explicit SDK terms acceptance; no publication |

All four accept manual dispatch. The app workflow has no pull-request trigger; do not infer pre-merge coverage for its dependency updates.
