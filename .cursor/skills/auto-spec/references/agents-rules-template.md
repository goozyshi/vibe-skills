# AGENTS.md Auto-Spec 规则模板

以下内容由 `/auto-spec init` 注入到项目 `AGENTS.md`，用 `<!-- auto-spec-start -->` / `<!-- auto-spec-end -->` 标记包裹。

Gate 只写触发条件；workflow 细节在 skill 内，按需加载。

---

<!-- auto-spec-start -->

## Auto-spec continuity gates

收到实现、修复、重构、新功能、接口变更、续开发类任务时，读 `.cursor/skills/auto-spec/SKILL.md`（`.agents/skills/auto-spec/SKILL.md` 亦可），按 continuity 命令执行。纯调研/Q&A 除外。

1. **改动前先分级** — `level`。首条回复 `[Spec: L0|L1|L2]`。L0 直接做；L1/L2 无 change 契约禁止写 in_scope 代码（`/skip-spec` 除外）。

2. **L2 先 planning** — `setup`（无 change）或 `start`（续 change）。回复须点名 `openspec/changes/<name>/`。

3. **实现后自动审查** — in_scope 落地后同轮 `check`；基本满足则自动 `review`（独立子代理，实现 agent 不自审）。纯文档/格式任务记录跳过原因。

4. **交接阻断** — 阻塞项、缺 change、有 in_scope 未 review → BLOCKED。`accepted`/`cancelled` 仅人类；archive 走 OpenSpec。

新会话存在 `openspec/` 时执行 `recover`。

<!-- auto-spec-end -->
