---
name: spec-context
description: Spec 驱动开发上下文管理。触发：/init、/prd-to-spec、/find-spec、/review、/archive、/status、/skip-spec、/context，或用户提及 spec 需求跟踪、验收标准、需求一致性检查。收到实现/修复/重构/新功能/接口变更时按 continuity 命令执行。
---

# Spec Context

结构化需求 spec 管理层。Git 仓库为唯一真相源。

**Workflow 细节**：[references/workflow.md](references/workflow.md)（gate 触发后加载，勿在 AGENTS.md 重复）

## Continuity 命令

AGENTS.md gate 引用以下命令（非 slash，skill 内执行）：

| 命令 | 用途 |
|------|------|
| `level` | 改动前 L0/L1/L2 分级 |
| `setup` | L2 无 spec → 自动创建 |
| `start` | L2 有 spec → 加载实现 |
| `check` | 代码落地后验收对照 |
| `review` | 完整 review 闭环 → [commands/review.md](commands/review.md) |
| `recover` | 新会话恢复上下文 |

## Slash 命令

| 命令 | 文件 |
|------|------|
| `/init` | [commands/init.md](commands/init.md) |
| `/prd-to-spec` | [commands/prd-to-spec.md](commands/prd-to-spec.md) |
| `/find-spec` | [commands/find-spec.md](commands/find-spec.md) |
| `/review` | [commands/review.md](commands/review.md) |
| `/archive` | [commands/archive.md](commands/archive.md) |
| `/status` | [commands/status.md](commands/status.md) |
| `/skip-spec` | [commands/skip-spec.md](commands/skip-spec.md) |
| `/context <id>` | [commands/context.md](commands/context.md) |

## 核心词汇

- **spec** — frontmatter + markdown，生命周期与代码绑定
- **L0/L1/L2** — L0 不碰 spec；L1 只读 index；L2 完整 spec + 自动 review
- **dev-complete** — AI 完成开发待人类验收；AI 不能设 `accepted`/`cancelled`
- **index.json** — 活跃 spec 索引，脚本重建

## 目录结构

```
specs/
  active/
  archive/
  summaries/
  index.json
  scripts/
```

## 共享引用

| 引用 | 文件 |
|------|------|
| AGENTS gate 模板 | [references/agents-rules-template.md](references/agents-rules-template.md) |
| Workflow | [references/workflow.md](references/workflow.md) |
| Spec 模板 | [references/spec-template.md](references/spec-template.md) |
| Review 报告 | [references/review-report-format.md](references/review-report-format.md) |
| 归档摘要 | [references/summary-template.md](references/summary-template.md) |

## 脚本

| 脚本 | 功能 |
|------|------|
| `scripts/generate-spec-index.js` | 生成 index.json |
| `scripts/archive-delivered-specs.js` | 归档 accepted/cancelled |
| `scripts/check-association.js` | CI 关联检查 |

Node.js >= 18，无第三方依赖。
