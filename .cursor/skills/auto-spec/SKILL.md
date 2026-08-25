---
name: auto-spec
description: Contract 调度 OpenSpec。用于实现或行为变更前的 L0/L1/L2 分级，以及 L2 的提案、验收、归档和恢复。
---

# Auto-Spec

**Contract** — 用户未打 slash 时，AGENTS gate 与 continuity 命令决定是否进入 OpenSpec。

**Engine owns artifacts** — OpenSpec CLI 与官方 skills 创建、更新、验证和归档工件；auto-spec 只分级、调度、验收和审查。

工作流细节在 [workflow](references/workflow.md)。CLI、版本与官方 skill 调用在 [bridge](references/openspec-bridge.md)。

## Continuity 命令

AGENTS.md gate 引用以下命令（非 slash，skill 内执行）：

| 命令      | 用途                                            |
| --------- | ----------------------------------------------- |
| `level`   | 改动前 L0/L1/L2 分级                            |
| `setup`   | L2 无 active change → 调用官方 propose          |
| `start`   | L2 有 active change → 读取官方状态并继续 apply  |
| `check`   | 执行 CLI validate、官方 verify skill 与验收对照 |
| `review`  | verify skill 后独立子代理审查，最多 3 轮        |
| `recover` | 新会话恢复上下文                                |

## Slash 命令

| 命令              | 文件                                 |
| ----------------- | ------------------------------------ |
| `/auto-spec init` | [commands/init.md](commands/init.md) |

OpenSpec 原生 slash（`/opsx-propose` 等）保留，手动 override 自动 schedule。

## 共享引用

| 引用             | 文件                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| AGENTS gate 模板 | [references/agents-rules-template.md](references/agents-rules-template.md) |
| Workflow         | [references/workflow.md](references/workflow.md)                           |
| OpenSpec bridge  | [references/openspec-bridge.md](references/openspec-bridge.md)             |
| Sidecar schema   | [references/sidecar-schema.md](references/sidecar-schema.md)               |
| Review floor     | [references/review/](references/review/)                                   |
