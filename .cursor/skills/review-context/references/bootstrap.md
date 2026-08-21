# Review Context Bootstrap

Use this reference only when `check_bootstrap.py` reports `needs-bootstrap`.

## Managed AGENTS block

Append this block to `AGENTS.md` when the file has no equivalent continuity gates:

```markdown
<!-- review-context:bootstrap:start -->
## Review continuity gates

1. **实现前先契约**：收到实现、修复、重构、新增功能、改接口或续做开发任务时，先 Read `.cursor/skills/review-context/SKILL.md`，执行 `setup` 或 `start`，在回复中点名契约路径；无契约不得改代码（纯调研/问答除外）。
2. **实现后自动审查**：in_scope 应用代码落地后，同轮对照 `acceptance_criteria` 执行 `check`；验收项 substantially met 时自动 `review`（phase=`verification`），不等用户说提交；纯文档/格式任务须在契约记 `review_skipped_reason`。
3. **pre-commit 复核**：提交前进入 `pre-commit`；快照 hash 相对上次 review 有变则再跑 scoped review；禁止用过期审查结果。
4. **P0/P1 阻断交接**：P0/P1、身份冲突、缺契约、有应用代码但未 review 时 BLOCKED；P2/P3 只报告。
<!-- review-context:bootstrap:end -->
```

If an equivalent block already exists, leave `AGENTS.md` unchanged. If a partial block or conflicting rule exists, report the conflict and request a manual decision.

## Managed CLAUDE import

`CLAUDE.md` must contain this standalone import line:

```markdown
@AGENTS.md
```

If it is absent and the file contains only a duplicate project-rule entry, propose replacing the duplicate entry with the import. Preserve unrelated Claude-specific instructions. If the file contains conflicting instructions, pause instead of replacing content.

## Apply and verify

Apply only after explicit user authorization. Then run:

```bash
python3 .cursor/skills/review-context/scripts/check_bootstrap.py
```

Continue to task-contract setup only when the result is `ready`. The bootstrap patch is idempotent: a later `setup` must not append a second managed block or rewrite either file.
