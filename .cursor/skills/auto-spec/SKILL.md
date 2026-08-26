---
name: auto-spec
description: "Dispatches OpenSpec for implementation and behavior changes: classifies L0/L1/L2, routes L2 to official skills, and schedules evidence, review, and handoff."
---

# Auto-Spec

**Dispatch** — auto-spec 决定下一步由谁做；OpenSpec 管理 change、spec 与 archive 事实。

**Engine owns artifacts** — OpenSpec CLI 与官方 skills 创建、更新、验证和归档工件。auto-spec 不复制工件、生命周期或 archive 门禁。

按当前分支加载一个引用：

- 改动前分级或处理 spec 漂移 → [classify](references/classify.md)
- L2 proposal、apply 或官方调用 → [dispatch](references/dispatch.md)
- 收集证据或安排独立 review → [review](references/review.md)
- 交给人验收或恢复会话 → [handoff](references/handoff.md) / [recover](references/recover.md)
- 查询 OpenSpec CLI、版本或官方 skill → [bridge](references/openspec-bridge.md)
- 查询调度上下文字段 → [schedule context](references/schedule-context.md)

## Continuity 命令

| 命令      | 用途                                       |
| --------- | ------------------------------------------ |
| `level`   | 分级并决定是否进入 OpenSpec                |
| `setup`   | L2 无 active change → 调用官方 propose     |
| `start`   | L2 有 active change → 读取状态并继续 apply |
| `check`   | 收集当前快照的验证、任务与测试证据         |
| `review`  | 按风险调度独立审查                         |
| `handoff` | 报告可人工验收状态，不自动 archive         |
| `recover` | 新会话定位相关 active change               |

## Slash 命令

| 命令              | 文件                                 |
| ----------------- | ------------------------------------ |
| `/auto-spec init` | [commands/init.md](commands/init.md) |

OpenSpec 原生 slash（`/opsx-propose`、`/opsx-archive` 等）保留。archive 始终由人通过 OpenSpec 官方流程决定。

## 共享引用

| 引用             | 文件                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| AGENTS gate 模板 | [references/agents-rules-template.md](references/agents-rules-template.md) |
| Review floor     | [references/review/](references/review/)                                   |
| 行为 eval        | [evals/evals.json](evals/evals.json)                                       |
