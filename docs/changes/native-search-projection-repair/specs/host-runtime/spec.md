# Delta for host-runtime

## MODIFIED Requirements

### Requirement: Native search projection limit
Native message search SHALL stay disabled until a bounded projection exists, and
the reason SHALL stay documented.

#### Scenario: Disabled state

- GIVEN the limit above
- WHEN Core configures search
- THEN `messageSearchEnabled` is `false`
- AND indexing stops while the database and sessions are preserved

#### Scenario: Gate on four conditions

- GIVEN an upstream projection becomes available
- WHEN enabling indexing is proposed
- THEN all four conditions in the acceptance table are verified by named checks
- AND each check records the OpenCode version it ran against
- AND indexing is enabled only when all four pass
- AND it is not enabled on the strength of a reduced page size or a raised memory limit alone

#### Scenario: Verification is versioned

- GIVEN an acceptance check runs
- WHEN its result is recorded
- THEN it names the OpenCode version of the service it ran against
- AND a result taken against a different version is recorded separately

#### Scenario: Rollback is a setting

- GIVEN indexing was enabled and a defect appears
- WHEN it is disabled again
- THEN `messageSearchEnabled` returns to `false`
- AND the database and the sessions are preserved
- AND the pre-migration backup taken during rollout restores the earlier state
