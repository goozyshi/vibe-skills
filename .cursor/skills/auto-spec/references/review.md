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

## Review gate

| Condition                                                    | Dispatch                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| L0                                                           | No independent review.                                                                         |
| L1                                                           | Reclassify first. Review only when a shared or uncertain contract remains after investigation. |
| L2, normal risk, 100% tasks and all required evidence passes | In the same turn, dispatch one final independent subagent review.                              |
| L2, high risk, 100% tasks and all required evidence passes   | In the same turn, dispatch one final independent subagent review.                              |
| L2, high risk, 80%–99% tasks and no interim review yet       | Dispatch one interim risk review when `high_risk_interim_review` is true.                      |

High risk means an authorization or security boundary, payment/balance behavior, data migration/write, public or shared API, cross-module contract, or a change that required replanning after failed checks.

An interim review checks direction, architecture, and high-risk omissions. A final review checks acceptance, quality, and security for the current snapshot. Passing tests, lint, build, `verify`, or self-checks are evidence; none is a final review.

## `review`

1. Calculate SHA-256 from every in-scope tracked and untracked file path, status, and exact bytes.
2. Skip only when the same snapshot already has the same review type in schedule context.
3. Select one review skill: workspace `.cursor/skills/`, then `.agents/skills/`, then user skill directories; use [review floor](review/) only when none matches the scope.
4. Select a review model from the runtime’s available models. Prefer one different from the implementing session model; do not pin a repository model. If none is available or identifiable, inherit the session model.
5. Dispatch a separate subagent with the selected model. Give it the selected skill path and require it to load that skill before reviewing tasks, delta specs, current diff, validation/verification/test evidence, and prior findings.
6. Receive its scoped P0–P3 report. The implementing agent must not replace this report with self-review.
7. Return P0/P1 findings to `apply` for correction. After the diff changes, return to `check`; report P2/P3 as warnings.
8. Update `last_review_snapshot`, `last_review_type`, `last_review_conclusion`, and `last_review_report`; set `interim_reviewed: true` after an interim review.

**Completion criterion:** a scoped report from a separate subagent exists for the current snapshot and identifies the loaded review skill; schedule context records its report reference, conclusion, snapshot, and review type. If dispatch or report collection fails, remain `BLOCKED` and do not hand off.
