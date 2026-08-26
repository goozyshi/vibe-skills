# Review

**Review window** — task progress schedules review; it never proves correctness.

Read the active change’s `tasks.md`, delta specs, schedule context, and current in-scope diff. Count only task checkboxes in the active change.

Read `.auto-spec.yaml` when it exists. `high_risk_interim_review` defaults to `true`.

## `check`

1. Run `<openspec> status --change <name> --json`.
2. Run `<openspec> validate <name> --strict --json`.
3. Run the official `verify` skill.
4. Run the change-required test, lint, and build commands.
5. Compare delta specs, tasks, and the current diff. Report each required acceptance item as passed, partial, or unmet.

**Completion criterion:** current validation, verification, command results, task progress, and acceptance verdicts are explicit.

## Review policy

| Condition | Dispatch |
| --- | --- |
| L0 | No independent review. |
| L1 | Reclassify first. Review only when a shared or uncertain contract remains after investigation. |
| L2, normal risk, 100% tasks and all required evidence passes | Dispatch one final independent review. |
| L2, high risk, at least 80% tasks and no interim review yet | Dispatch one interim risk review when `high_risk_interim_review` is true. |
| L2, high risk, 100% tasks and all required evidence passes | Dispatch final independent review. |

High risk means an authorization or security boundary, payment/balance behavior, data migration/write, public or shared API, cross-module contract, or a change that required replanning after failed checks.

An interim review checks direction, architecture, and high-risk omissions. A final review checks acceptance, quality, and security for the current snapshot.

## `review`

1. Calculate SHA-256 from every in-scope tracked and untracked file path, status, and exact bytes.
2. Skip only when the same snapshot already has the same review type in schedule context.
3. Select review instructions: workspace `.cursor/skills/` then `.agents/skills/`, then user skill directories; use [review floor](review/) only when no matching code-quality or security skill exists.
4. Dispatch an independent subagent with tasks, delta specs, current diff, validation/verification/test evidence, and prior findings.
5. Require P0/P1 findings to return to `check`. Report P2/P3 as warnings.
6. Update `last_review_snapshot` and `last_review_type`; set `interim_reviewed: true` after an interim review.

**Completion criterion:** a scoped independent report exists for the current snapshot, and schedule context records its review type.
