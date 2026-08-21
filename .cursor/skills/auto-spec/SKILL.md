---
name: auto-spec
description: OpenSpec 引擎上的 spec 调度层。触发：/auto-spec init，或用户提及 openspec 自动调度、L0/L1/L2 分级、accepted 验收、change 恢复。收到实现/修复/重构/新功能/接口变更/续开发类任务时按 continuity 命令执行。
---

# Auto-Spec

**schedule** — 用户未打 slash 时，由 AGENTS gate + continuity 命令决定何时进入 OpenSpec workflow。

**engine** — `openspec` CLI 与 `openspec-*` 官方 skills。auto-spec 只调度，不 fork、不手改官方产物。

**Workflow 细节**：[references/workflow.md](references/workflow.md)（gate 触发后加载，勿在 AGENTS.md 重复）

## Continuity 命令

AGENTS.md gate 引用以下命令（非 slash，skill 内执行）：

| 命令 | 用途 |
|------|------|
| `level` | 改动前 L0/L1/L2 分级 |
| `setup` | L2 无 active change → 桥接 OpenSpec propose |
| `start` | L2 有 active change → 加载并继续 apply |
| `check` | 代码落地后对照 change 验收 |
| `review` | 独立子代理审查（validate 结构校验 + 验收对照 + 代码质量），最多 3 轮 |
| `recover` | 新会话恢复上下文 |

## Slash 命令

| 命令 | 文件 |
|------|------|
| `/auto-spec init` | [commands/init.md](commands/init.md) |

OpenSpec 原生 slash（`/opsx-propose` 等）保留，手动 override 自动 schedule。

## 共享引用

| 引用 | 文件 |
|------|------|
| AGENTS gate 模板 | [references/agents-rules-template.md](references/agents-rules-template.md) |
| Workflow | [references/workflow.md](references/workflow.md) |
| OpenSpec 桥接 | [references/openspec-bridge.md](references/openspec-bridge.md) |
| Sidecar schema | [references/sidecar-schema.md](references/sidecar-schema.md) |
| 内置 review 清单 | [references/review/](references/review/)（floor 兜底；环境 skill 优先） |
