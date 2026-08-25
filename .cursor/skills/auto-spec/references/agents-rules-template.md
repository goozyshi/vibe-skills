# AGENTS.md Auto-Spec 规则模板

以下内容由 `/auto-spec init` 注入到项目 `AGENTS.md`，用 `<!-- auto-spec-start -->` / `<!-- auto-spec-end -->` 标记包裹。

Gate 只写触发条件；workflow 细节在 skill 内，按需加载。

---

<!-- auto-spec-start -->

## Auto-spec continuity gates

收到实现、修复、重构、新功能、接口变更、续开发类任务时，读 `.cursor/skills/auto-spec/SKILL.md`（`.agents/skills/auto-spec/SKILL.md` 亦可），按 continuity 命令执行。纯调研/Q&A 除外。

1. **改动前先分级** — `level`。首条回复 `[Spec: L0|L1|L2]`。L1 只读调查，写入前必须显式重分级为 L0 或 L2，并说明依据、spec 状态和下一步；L2 无 change 契约禁止写 in_scope 代码（`/skip-spec` 除外）。

2. **L2 先 planning** — `setup`（无 change）或 `start`（续 change）。官方 propose 回合只完成规划；回复须点名 change 名称并等待后续继续。

3. **主 spec 跟随 change** — 除纯笔误外，主 spec 改动必须关联 active change。代码已先落地时，创建契约同步 change 补票。

4. **实现后自动审查** — in_scope 落地后同轮 `check`：CLI validate、官方 verify skill、必需验收与测试均通过，才派独立子代理 review。纯文档/格式任务记录跳过原因。

5. **交接阻断** — 阻塞项、缺 change、有 in_scope 未 review → BLOCKED。`accepted`/`cancelled` 仅人类；archive 只走 OpenSpec。

新会话存在 `openspec/` 时执行 `recover`。

<!-- auto-spec-end -->
