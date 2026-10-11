# Proposal: Native agent integration inventory

## Intent

OpenChamber talks to an OpenCode service that is managed outside the container.
The app's own flags enable native browser actions and native workspace
features, but nobody has inventoried what tools an externally managed OpenCode
actually advertises back. Until that is known, any claim about agent capability
rests on assumption.

This change does the inventory first, then adds only the integration that is
demonstrably missing and scoped. It exists to prevent the opposite failure: a
speculative integration that turns out to be unnecessary, or one that assumes
managed-child plugin injection works when it does not.

## Scope

In scope:

- Inventorying the tools and capabilities an externally managed OpenCode
  advertises, through a documented, repeatable method.
- Recording which of the app's native flags are already enabled and what each
  one actually gates.
- Adding only the integration that the inventory shows is missing, and scoping
  it to the consumer that needs it.

Out of scope:

- Assuming or relying on managed-child plugin injection into external OpenCode.
- Any change to the app image or the browser image.
- New agent-facing extensions or a second orchestrator.
- Changing the host's OpenCode configuration.

## Approach

Read the running service. The inventory is an observation exercise with a
written method, not a code change: query the externally managed OpenCode's tool
and capability surface, record what comes back, and compare it against what the
app's flags claim to enable. The comparison is the deliverable.

The second step is conditional. If the inventory shows a gap, the integration
that closes it is designed against a named consumer, consistent with the
standing rule that a new abstraction, option or dependency needs a current
consumer.

## Changes

**Native integration boundary in specs/host-runtime**

- From: The spec states that managed-child plugin injection is a separate
  integration boundary and must not be assumed, and that `agentWebToolEnabled`,
  `agentControlToolEnabled` and `browserProvider=builtin` are in use. It does
  not state what the external OpenCode advertises back.
- To: A requirement that the externally managed OpenCode's advertised tool and
  capability surface is inventoried by a documented method, that the inventory
  records the OpenCode version it was taken against, and that any integration
  added from it names its consumer.
- Reason: The boundary is currently described only from the app's side.
- Impact: Documentation and, if a gap is found, one scoped integration.

**Assumption boundary**

- From: No requirement forbids treating the app's flags as proof of external
  capability.
- To: A requirement that the app's enabled flags are not accepted as evidence of
  what an external OpenCode advertises.
- Reason: The inventory exists because that inference is the failure mode.
- Impact: Documentation only.

## Acceptance checks

| Check | How it is verified |
| --- | --- |
| The inventory method is repeatable | A second run against the same service returns the same list |
| The inventory is versioned | The recorded OpenCode version matches the service that was queried |
| The app flags are not treated as proof | The inventory records what the service advertises, separately from what the app enables |
| Any added integration has a consumer | The change that adds it names the consumer and the tool it closes a gap for |
| No injection is assumed | No step relies on managed-child plugin injection |

## Rollback

The inventory is read-only and adds nothing to roll back. Any integration that
follows from it is removed with its own change, and disabling it returns the
external OpenCode to its previous advertised surface.

## Status

Next. Agreed and unblocked.
