# /auto-spec init

初始化 auto-spec。幂等——已存在的结构跳过，不覆盖。两 phase，一次报告。

## Phase A — OpenSpec engine

### A1. Node 版本

`node --version` ≥ 20.19。不满足 → 停止，提示升级。

### A2. 检测 openspec

按 [openspec-bridge.md](../references/openspec-bridge.md#版本与调用) 解析。未检测到精确 devDependency 时，先识别项目包管理器并引导安装，不把它只报告为阻断：

1. 按 `packageManager` 字段 → 唯一 lockfile（`pnpm-lock.yaml` / `yarn.lock` / `package-lock.json` / `bun.lock*`）的顺序识别。多个 lockfile 或均不存在时，询问用户选择；不猜测。
2. 有 `package.json` 且已唯一识别：用确认卡片提供“安装 OpenSpec 1.10.0”与“取消”。
   - pnpm：`pnpm add -D --save-exact @fission-ai/openspec@1.10.0`
   - npm：`npm install -D --save-exact @fission-ai/openspec@1.10.0`
   - yarn：`yarn add -D --exact @fission-ai/openspec@1.10.0`
   - bun：`bun add -d --exact @fission-ai/openspec@1.10.0`
3. 用户在卡片选择安装即为授权：立即执行唯一对应的安装命令；不要求复制、粘贴或再次确认。选择取消则停止且不写入。
4. 无 `package.json`：用确认卡片询问是否先创建 package manifest；未经选择不创建。
5. 安装成功后重新解析 `<openspec>` 并在**同次 `/auto-spec init`** 继续 A3；不要求用户再次运行 init。

完成标志：`<openspec> --version` 为 `1.10.0`。

### A3. openspec init

推断当前工具 ID（cursor / claude / codex，可多选）。先运行 `<openspec> config profile`，选择 custom、`propose`、`apply`、`verify`、`update`、`sync`、`archive`，并为支持 slash 的工具选择 commands delivery。`openspec/` 不存在时运行 `<openspec> init --tools <ids>`；两种情况都运行项目本地 `<openspec> update`，按已选 profile 生成 skills 与 commands，最后复验版本仍为 `1.10.0`。

已有 `openspec/` 不覆盖 specs/changes。

用户输出不用 `custom profile`。能力名使用 OpenSpec 原始标识：

`explore` / `propose` / `apply` / `verify` / `update` / `sync` / `archive`

按实际生成的 skill 与 command 分两组报告：

- **已接入**：可由当前工具调用的能力及其命令。
- **未接入**：未生成的能力、它缺少的工作环节，以及是否阻断完整变更链路。

`propose`、`apply`、`verify`、`update`、`sync`、`archive` 缺失时展示“修复 OpenSpec 变更链路”确认卡片；`explore` 未接入只提示可选增强。选中修复后运行 `config profile → update` 并重新检查。

完成标志：`openspec/` 存在，且每个已选工具的官方 `propose`、`apply`、`verify`、`update`、`sync`、`archive` skills 可用；支持 slash 的工具还生成对应 commands。

### A4. 填充 project context

读取 engine 生成的 `openspec/config.yaml`。只填当前配置实际声明的项目上下文字段，不增加自定义 key。

只写从仓库可证实的内容；无法确认的字段留空并列入报告，不编造。

完成标志：已填字段均可由仓库证实；余项在报告列出。

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

| 平台        | 桥接文件    |
| ----------- | ----------- |
| Claude Code | `CLAUDE.md` |
| Gemini CLI  | `GEMINI.md` |

Cursor 和 Codex 原生加载 `AGENTS.md`，无需桥接。

### B4. 写入 `.auto-spec.yaml`

不存在 → 写入：

```yaml
version: "1.1"
openspec:
  version: "1.10.0"
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

已存在 → 校验 `openspec.version` 为 `"1.10.0"`。缺失或不匹配时展示迁移补丁，未经确认不覆盖。

### B5. Skill 发现（运行时，不持久化）

按 [workflow.md](../references/workflow.md#skill-discovery) 扫描可委托的 review skill，结果仅入报告。

## 报告

向用户输出：

- Phase A：OpenSpec 精确版本、安装方式、变更链路能力自检、init 结果、tools、context 填充结果（含留空字段）
- Phase B：skill 安装路径、AGENTS.md 状态（ready/needs-inject/conflict 及处理）、桥接状态、`.auto-spec.yaml` 是否写入
- B5 发现的 skill 与未匹配角色的回退说明
