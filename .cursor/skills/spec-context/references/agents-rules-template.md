# AGENTS.md Spec 规则模板

以下内容由 `/init` 注入到项目 `AGENTS.md`，用 `<!-- spec-system-start -->` / `<!-- spec-system-end -->` 标记包裹。

Gate 只写触发条件；workflow 细节在 skill 内，按需加载。

---

<!-- spec-system-start -->

## Spec continuity gates

收到实现、修复、重构、新功能、接口变更、续开发类任务时，读 `.cursor/skills/spec-context/SKILL.md`（`.agents/skills/spec-context/SKILL.md` 亦可），按 skill 内 continuity 命令执行。纯调研/Q&A 除外。

1. **改动前先分级** — 执行 `level`。首条回复声明 `[Spec: L0|L1|L2]`。L0 直接做；L1/L2 无 spec 契约禁止写 in_scope 代码（`/skip-spec` 除外）。

2. **L2 先准备 spec** — 执行 `setup`（无关联 spec）或 `start`（续已有 spec）。回复须点名 spec 路径。

3. **实现后自动审查** — in_scope 代码落地后同轮执行 `check`；验收基本满足则自动 `review`，不等用户催。纯文档/格式改动须在 spec 记录跳过原因。

4. **交接阻断** — 存在阻塞项、缺 spec、有 in_scope 代码未 review → BLOCKED。`accepted`/`cancelled` 仅人类可设。

新会话且存在 `specs/index.json` 时，执行 `recover` 检查未完成 spec。

<!-- spec-system-end -->
