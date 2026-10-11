# Tasks

## 1. Document the inventory method

- [ ] 1.1 Write down the exact steps for querying the external OpenCode's advertised tool and capability surface.
- [ ] 1.2 Include the probe-session discipline: create, read and delete only an owned session, and change no configuration.
- [ ] 1.3 State where the recorded output lives and how it is versioned.

## 2. Take the inventory

- [ ] 2.1 Run the documented method against the running external OpenCode.
- [ ] 2.2 Record the OpenCode version of the service that was queried.
- [ ] 2.3 Record the app's enabled flags separately from the service's advertised surface.
- [ ] 2.4 Note every capability the app assumes but the service does not advertise.

## 3. Verify the method

- [ ] 3.1 Run the method a second time and confirm the list is identical.
- [ ] 3.2 Confirm the probe session was created and deleted, and no configuration changed.
- [ ] 3.3 Confirm no published artifact or image changed.

## 4. Assess gaps

- [ ] 4.1 For each missing capability, name the tool and the consumer that needs it.
- [ ] 4.2 Confirm none of the fixes relies on managed-child plugin injection.
- [ ] 4.3 If no gap is found for a proposed capability, record it as declined with the evidence.
- [ ] 4.4 For any demonstrated gap, open a separate change rather than extending this one, unless the gap is small enough to close here with a named consumer.

## 5. Record the result

- [ ] 5.1 Apply the delta in `specs/host-runtime/spec.md`.
- [ ] 5.2 Record the inventory output, the service version and the date it was taken.
- [ ] 5.3 Note the next date the inventory should be retaken, and what would trigger an earlier retake.
