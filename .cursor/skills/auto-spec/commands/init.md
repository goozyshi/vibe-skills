# /auto-spec init

初始化 auto-spec。幂等——已存在的结构跳过，不覆盖。两 phase，一次报告。

## Phase A — OpenSpec engine

### A1. Node 版本

`node --version` ≥ 20.19。不满足 → 停止，提示升级。

### A2. 检测 openspec

按 [openspec-bridge.md](../references/openspec-bridge.md#invoke-解析) 解析。均不可用 → 询问用户：

- devDep：`package.json` 加 `@fission-ai/openspec`，invoke 为 `pnpm exec openspec`（按项目包管理器调整）
- 全局：`npm i -g @fission-ai/openspec`

完成标志：`<openspec> --version` 可执行。

### A3. openspec init

推断当前工具 ID（cursor / claude / codex，可多选）→ `<openspec> init --tools <ids>`。

已存在 `openspec/` → 跳过，不覆盖已有 specs/changes。

完成标志：`openspec/` 目录存在。

### A4. 填充 project context

`openspec/config.yaml` 的 `context` 段自带模板 prompt（背景、规格/约定、技术栈、测试策略、外部依赖）。按该 prompt 分析项目（README、package.json、目录结构、现有配置），把 `context` 占位替换为真实项目信息。

只写从仓库可证实的内容；无法确认的字段留空并列入报告，不编造。

完成标志：`context` 段无模板占位文字。

## Phase B — Schedule 层

### B1. 安装 skill

将本 skill 复制到 `.cursor/skills/auto-spec/`、`.agents/skills/auto-spec/`、`.claude/skills/auto-spec/`（按 Phase A 推断的工具 ID 决定目标集合）。已存在且内容一致 → 跳过。

### B2. 注入 AGENTS.md gate

读取 [agents-rules-template.md](../references/agents-rules-template.md)。三态检测：

1. **ready** — `<!-- auto-spec-start -->` / `<!-- auto-spec-end -->` 间内容与模板一致 → 跳过。
2. **needs-inject** — 无标记 → 创建文件或末尾追加（标记包裹）。
3. **conflict** — 标记存在但内容不一致 → 展示差异，询问「覆盖 / 合并 / 跳过」，不自动覆盖。

### B3. 跨平台桥接

`AGENTS.md` 是规则唯一真相源。桥接文件逐个处理（不存在 → 创建；已有 `@AGENTS.md` → 跳过；无 → 末尾追加）：

| 平台 | 桥接文件 |
|------|---------|
| Claude Code | `CLAUDE.md` |
| Gemini CLI | `GEMINI.md` |

Cursor 和 Codex 原生加载 `AGENTS.md`，无需桥接。

### B4. 写入 `.auto-spec.yaml`

不存在 → 写入：

```yaml
version: "1.0"
openspec:
  invoke: "pnpm exec openspec" # A2 的实际解析结果
  tools: [cursor] # A3 的实际工具 ID
scheduling:
  auto_propose_on_L2: true
  auto_review_on_L2: true
  review_max_iterations: 3
  skip_explore_if_prd: true
acceptance:
  require_accepted_before_archive: true
```

已存在 → 跳过。

### B5. Skill 发现（运行时，不持久化）

按 [workflow.md](../references/workflow.md#skill-discovery) 扫描可委托的 review skill，结果仅入报告。

## 报告

向用户输出：

- Phase A：openspec 安装方式、init 结果、tools、context 填充结果（含留空字段）
- Phase B：skill 安装路径、AGENTS.md 状态（ready/needs-inject/conflict 及处理）、桥接状态、`.auto-spec.yaml` 是否写入
- B5 发现的 skill 与未匹配角色的回退说明
