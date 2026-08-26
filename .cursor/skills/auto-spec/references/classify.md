# Classify

**Dispatch test** — identify consumers: product users, developers, agents, or CI. A consumer gaining, losing, or observing a different capability is a contract change.

| Level | Evidence | Dispatch |
| --- | --- | --- |
| L0 | All affected consumers keep the same contract. | Change directly. |
| L1 | Consumer or contract impact needs investigation. | Read specs, active changes, callers, and tests; then emit a terminal reclassification. |
| L2 | A consumer contract changes, or investigation cannot prove it unchanged. | Create or continue an OpenSpec change before writing in-scope code. |

Use `[Spec: L0]`, `[Spec: L1]`, or `[Spec: L2]` in the first response. An explicit user `/skip-spec` routes the request to L0 and records that choice.

## L1 closeout

L1 is a read-only probe, not an execution outcome. After the probe, an actionable request ends with exactly one terminal result:

```text
[Spec: L0] → change directly
[Spec: L2] → dispatch OpenSpec before changing in-scope files
```

Ask one focused question only when its answer materially changes that terminal result. Otherwise, inability to prove every consumer unchanged routes to L2.

## Spec drift

| Evidence | Dispatch |
| --- | --- |
| Code violates a current spec. | L0 bugfix: align code to the spec. |
| A current spec no longer represents the intended contract. | L2: update the contract through an OpenSpec change. |
| The discrepancy is only a typo and changes no behavior, test, published interface, or decision. | L0: correct the spec. |

Do not merge a change into someone else’s active change. Create a contract-sync change when ownership differs.

**Completion criterion:** the response states the consumer/contract evidence, the spec state (`current`, `stale`, `absent`, or `unknown`), and an L0 or L2 terminal dispatch action; a pending focused question names the missing decision.
