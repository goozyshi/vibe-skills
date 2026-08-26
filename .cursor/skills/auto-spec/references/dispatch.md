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
3. If planning is complete, dispatch the official `apply` skill.
4. When requirements change, dispatch the official `update` skill before applying more work.

**Completion criterion:** the official skill received the current change context.

## Boundaries

Auto-spec dispatches `propose`, `apply`, `verify`, and `update`. It never rewrites official artifacts or calls `archive` automatically. Human acceptance and archive remain OpenSpec operations.
