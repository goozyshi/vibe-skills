# Dispatch

Use the project-local `<openspec>` invocation from [openspec-bridge.md](openspec-bridge.md).

## `setup`

For L2 with no related active change:

1. Run `<openspec> list --json`.
2. Match active changes with schedule-context `related_files` and `keywords`.
3. If none match, dispatch the official `propose` skill. Do not handwrite OpenSpec artifacts.
4. Create `.auto-spec/changes/<name>.yaml` with the related files and keywords.
5. Stop after planning. Ask for any material unknowns recorded by the proposal.

**Completion criterion:** `<openspec> status --change <name> --json` reports planning complete and every `applyRequires` artifact is `done` or `skipped`. The response names the change and the next action.

## `start`

For an active related change:

1. Read `<openspec> status --change <name> --json` and the schedule context.
2. If planning is incomplete, dispatch the official next planning skill.
3. When requirements change, dispatch the official `update` skill before applying more work.
4. If planning is complete, dispatch the official `apply` skill with a **return ticket**: after applying, it must return to auto-spec `check` before reporting implementation complete, handoff, or asking for review.
5. Run `check` after every `apply` return. Load [review](review.md) for the evidence chain and review gate:
   - completed tasks and passing evidence → dispatch `review` in the same turn;
   - high-risk change, 80%–99% tasks, `high_risk_interim_review` enabled, and no interim review → dispatch interim review, then continue implementation;
   - incomplete tasks or failed/missing evidence → continue implementation; do not hand off;
   - review P0/P1 → return findings to official `apply`, then repeat `check`;
   - unavailable review report → remain `BLOCKED`;
   - final review passes → report handoff.

**Completion criterion:** the official skill received the current change context and returned through `check`; completed implementation has either a current final subagent review or an explicit `BLOCKED` result. A self-reported implementation completion does not end `start`.

## Boundaries

Auto-spec dispatches `propose`, `apply`, `verify`, and `update`. It never rewrites official artifacts or calls `archive` automatically. Human acceptance and archive remain OpenSpec operations.
