# AGENTS.md Auto-Spec 规则模板

以下内容由 `/auto-spec init` 注入到项目 `AGENTS.md`，用 `<!-- auto-spec-start -->` / `<!-- auto-spec-end -->` 标记包裹。

Gate 只写触发条件；workflow 细节在 skill 内，按需加载。

---

<!-- auto-spec-start -->

## Auto-spec continuity gates

收到实现、修复、重构、新功能、接口变更、续开发类任务时，读 `.cursor/skills/auto-spec/SKILL.md`（`.agents/skills/auto-spec/SKILL.md` 亦可），按 continuity 命令执行。纯调研/Q&A 除外。

1. **先 dispatch** — `level`。首条回复 `[Spec: L0|L1|L2]`。消费者契约改变为 L2；能证明不变为 L0；证据不足为 L1。L1 只读调查后，在同一可执行请求中收口为 L0 或 L2；只有缺少会改变分级的决定时才提问。

2. **L2 进官方 workflow** — `setup`（无 change）或 `start`（续 change）。由官方 `propose`、`apply`、`update` 管理工件。

3. **spec 跟随 change** — 代码与当前 spec 不一致时，先判断 bugfix、纯笔误或契约变更；契约变更走 OpenSpec change。

4. **按风险审查** — `check` 收集 validate、verify、测试、任务与验收证据。普通 L2 在 100% 时做一次 final review；高风险 L2 在 80% 后可做 interim review，100% 时做 final review。

5. **交给人验收** — `handoff` 报告证据和 review 结论。人决定是否调用官方 OpenSpec archive。

新会话存在 `openspec/` 时执行 `recover`。

<!-- auto-spec-end -->
