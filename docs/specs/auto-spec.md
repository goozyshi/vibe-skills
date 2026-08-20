# Auto-Spec — 设计计划

> **创建日期**：2026-08-20
> **状态**：计划
> **Skill 名称**：auto-spec
> **前置阅读**：[spec-context.md](./spec-context.md)（调度模型）、[OpenSpec Supported Tools](https://openspec.dev/docs/reference/supported-tools)（引擎）

---

## 1. 定位

**auto-spec** = OpenSpec **engine**（planning 数据 + CLI + 官方 skills）+ **schedule** 层（L0/L1/L2 自动分级、continuity 闭环、硬验收）。

| 层                    | 负责                                                                        | 不负责                                               |
| --------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| OpenSpec              | change 脚手架、delta spec、proposal/design/tasks、archive merge、多工具适配 | 普通对话自动拦截、L0 跳过、accepted 门禁             |
| spec-context（现状）  | continuity gate、L0/L1/L2、自动 review、dev-complete/accepted               | OpenSpec 式 delta / schema / CLI                     |
| **auto-spec（目标）** | 复用 OpenSpec 数据面；继承 spec-context 调度面；统一目录为 `openspec/`      | 重写 OpenSpec CLI；维护 `openspec-*` 官方 skill 内容 |

**Leading word — schedule**：用户未打 slash 时，由 AGENTS gate + continuity 命令决定何时进入 OpenSpec workflow。

**Leading word — engine**：`openspec` CLI 与 `openspec-*` skills；auto-spec 只调度，不 fork。

---

## 2. 核心原则

### 2.1 Gate 薄、Workflow 厚

AGENTS.md 只放 continuity **gate**（~25 行）+ skill 路径。L0/L1/L2、状态机、review 闭环、recover 全在 `auto-spec/references/workflow.md`。与 [spec-context gate 重构](../.cursor/skills/spec-context/references/agents-rules-template.md) 同构。

### 2.2 PRD 是输入，不是 planning 完成

PRD 清晰 → 跳过 explore，**不跳过** propose。schedule 层 L2 自动调 OpenSpec propose（或等价 CLI），把 PRD 结构化为 change artifacts。

### 2.3 单轨数据

只保留 `openspec/`。不并存 `specs/active/` 与 `openspec/changes/`。迁移后废弃 spec-context 专属目录。

### 2.4 不手改官方产物

`openspec-*` skills/commands 由 `openspec init` / `openspec update` 管理。auto-spec 自定义 skill 命名 **`auto-spec`** / **`auto-spec-*`**，避免被 update 覆盖。

---

## 3. 架构

```
用户消息 / 改代码
       ↓
┌──────────────────────────┐
│  AGENTS.md gate          │  ← 每会话常驻（context load 最小）
│  → auto-spec/SKILL.md    │
└────────────┬─────────────┘
             │ continuity: level | setup | start | check | review | recover
             ▼
┌──────────────────────────┐
│  auto-spec/workflow.md   │  ← gate 触发后加载（cognitive → disclosed）
└────────────┬─────────────┘
             │ L2 setup → 调 engine
             ▼
┌──────────────────────────┐
│  OpenSpec engine         │
│  openspec CLI            │
│  openspec-* skills       │
│  openspec/changes|specs/ │
└──────────────────────────┘
```

---

## 4. 信息层次（writing-for-agents）

| 层级        | 文件                                            | 加载                         | 内容                                     |
| ----------- | ----------------------------------------------- | ---------------------------- | ---------------------------------------- |
| Gate        | 项目 `AGENTS.md` `<!-- auto-spec-start/end -->` | 常驻                         | 4 条 gate + skill 路径                   |
| Router      | `.cursor/skills/auto-spec/SKILL.md`             | description 匹配 / gate 点名 | continuity 命令表 + slash 路由           |
| Workflow    | `auto-spec/references/workflow.md`              | `level`/`setup`/… 触发       | L0/L1/L2、状态机、recover、review        |
| Engine 桥接 | `auto-spec/references/openspec-bridge.md`       | L2 `setup`/`start`           | CLI 调用、工具 invoke 表、devDep vs 全局 |
| 命令        | `auto-spec/commands/*.md`                       | `/auto-spec:*` slash         | init、migrate 等显式操作                 |
| 配置        | 项目 `.auto-spec.yaml`                          | workflow 读取                | invoke 前缀、review 轮数、工具 ID        |

**Context pointer 写法**（gate 内）：front-load `auto-spec`，一条 trigger 一个 branch，不堆 synonym。

---

## 5. Continuity 命令

与 spec-context 对齐，L2 的 `setup`/`start` 改为桥接 OpenSpec：

| 命令      | 时机                | engine 动作                                                                                     |
| --------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| `level`   | in_scope 代码前     | 无；见 workflow#level                                                                           |
| `setup`   | L2 无 active change | `openspec new change` + propose 流程（或调 `openspec-propose` skill）                           |
| `start`   | L2 有 active change | 读 `openspec/changes/<name>/`，继续 apply                                                       |
| `check`   | in_scope 代码落地后 | 对照 change 内 acceptance（tasks + delta specs）                                                |
| `review`  | check 基本通过      | **独立子代理**执行 validate + acceptance 对照 + 代码质量，最多 3 轮；无 review skill 不允许跳过 |
| `recover` | 新会话              | `openspec list --json` + keywords/`related_files` 映射                                          |

**Completion criterion — setup**：回复点名 `openspec/changes/<name>/` 且 proposal/tasks 就绪（`openspec status --change <name> --json` 中 apply 所需 artifact 均为 done）。

---

## 6. AGENTS.md Gate 模板（计划）

```markdown
<!-- auto-spec-start -->

## Auto-spec continuity gates

收到实现、修复、重构、新功能、接口变更、续开发类任务时，读 `.cursor/skills/auto-spec/SKILL.md`（`.agents/skills/auto-spec/SKILL.md` 亦可），按 continuity 命令执行。纯调研/Q&A 除外。

1. **改动前先分级** — `level`。首条回复 `[Spec: L0|L1|L2]`。L0 直接做；L1/L2 无 change 契约禁止写 in_scope 代码（`/skip-spec` 除外）。

2. **L2 先 planning** — `setup`（无 change）或 `start`（续 change）。回复须点名 `openspec/changes/<name>/`。

3. **实现后自动审查** — in_scope 落地后同轮 `check`；基本满足则自动 `review`（独立子代理，实现 agent 不自审）。纯文档/格式任务记录跳过原因。

4. **交接阻断** — 阻塞项、缺 change、有 in_scope 未 review → BLOCKED。`accepted`/`cancelled` 仅人类；archive 走 OpenSpec。

新会话存在 `openspec/` 时执行 `recover`。

<!-- auto-spec-end -->
```

---

## 7. `/auto-spec init`

幂等。两 phase，一次报告。

### Phase A — OpenSpec engine

| 步骤 | 动作                                               | 完成条件                                   |
| ---- | -------------------------------------------------- | ------------------------------------------ |
| A1   | `node --version` ≥ 20.19                           | 不满足则停止                               |
| A2   | 检测 `openspec` 或在 `.auto-spec.yaml` 配置 invoke | 无则 devDep 或提示全局安装                 |
| A3   | 推断工具 ID → `openspec init --tools …`            | `openspec/` 存在；不覆盖已有 specs/changes |
| A4   | 确认 `openspec/config.yaml` 有 `context` 占位      | 可编辑项存在                               |

devDep 推荐：`package.json` 加 `@fission-ai/openspec`，scripts 暴露 `pnpm exec openspec`。

### Phase B — Schedule 层

| 步骤 | 动作                                                         | 完成条件                   |
| ---- | ------------------------------------------------------------ | -------------------------- |
| B1   | 安装 `auto-spec` skill 至 `.cursor/`、`.agents/`、`.claude/` | skill 可发现               |
| B2   | 注入 AGENTS gate（三态：ready / needs-inject / conflict）    | gate 块完整                |
| B3   | 桥接 `CLAUDE.md` 等 → `@AGENTS.md`                           | 已有则跳过                 |
| B4   | 写入 `.auto-spec.yaml`                                       | invoke、tools、review 轮数 |
| B5   | 运行时扫描 code-reviewer 等（不持久化）                      | init 报告列出              |

**与 spec-context `/init` 差异**：不创建 `specs/active/`；OpenSpec 管数据目录。

### `.auto-spec.yaml` 计划字段

```yaml
version: "1.0"
openspec:
  invoke: "pnpm exec openspec" # 或 openspec
  tools: [cursor, codex, claude]
scheduling:
  auto_propose_on_L2: true
  auto_review_on_L2: true
  review_max_iterations: 3
  skip_explore_if_prd: true
acceptance:
  require_accepted_before_archive: true
```

---

## 8. 状态与验收（OpenSpec 扩展）

OpenSpec 原生无 `accepted`。计划在 change 侧 car：

```
openspec/changes/<name>/.auto-spec.yaml
```

```yaml
status: active | dev-complete | accepted | cancelled
dev_complete_sha: ""
rejection_count: 0
related_files: [src/foo/**]
keywords: [foo, bar]
```

| 状态         | 设者       | 含义                       |
| ------------ | ---------- | -------------------------- |
| active       | AI/人      | 开发中                     |
| dev-complete | AI         | 实现+review 通过，待人验收 |
| accepted     | **仅人类** | 可 archive                 |
| cancelled    | **仅人类** | 废弃                       |

archive 仍走 `openspec archive`；`.auto-spec.yaml` 中 `accepted` 为 schedule 层门禁。

---

## 9. 目录产物（init 后）

```
your-project/
├── openspec/                      # engine 数据（官方）
├── .auto-spec.yaml                # schedule 配置
├── AGENTS.md                      # gate
├── .cursor/skills/auto-spec/
├── .agents/skills/auto-spec/
├── .claude/skills/auto-spec/
├── .cursor/skills/openspec-*/     # 官方，勿手改
└── package.json                   # 可选 devDep
```

---

## 10. 与 spec-context / OpenSpec 对照

| 能力               | spec-context   | OpenSpec                    | auto-spec       |
| ------------------ | -------------- | --------------------------- | --------------- |
| Planning artifacts | 轻量 spec md   | proposal/design/tasks/delta | **OpenSpec**    |
| L0/L1/L2 自动分级  | ✅             | ❌                          | **schedule**    |
| 无 slash 自动调度  | ✅             | ❌                          | **schedule**    |
| 自动 review 3 轮   | ✅             | verify 可选                 | **schedule**    |
| accepted 硬验收    | ✅             | ❌                          | **sidecar**     |
| 多工具 init        | ❌             | ✅                          | **Phase A**     |
| PRD 入口           | `/prd-to-spec` | `/opsx:propose`             | L2 auto propose |

---

## 11. 迁移

已有 spec-context 项目：

1. `/auto-spec init` 检测 `<!-- spec-system-start -->` → conflict：替换 / 并存 / 跳过。
2. 活跃 spec `specs/active/` → 脚本或人工转为 `openspec/changes/`（一次性）。
3. 归档 `specs/archive/` → 保留 Git 历史；新归档走 OpenSpec。
4. 废弃 `specs/scripts/generate-spec-index.js`；索引改 `openspec list --json`。

---

## 12. Slash 命令（计划）

| 命令                 | 用途                                |
| -------------------- | ----------------------------------- |
| `/auto-spec init`    | Phase A + B                         |
| `/auto-spec migrate` | spec-context → openspec 一次性迁移  |
| `/auto-spec status`  | 合并 `openspec list` + sidecar 状态 |
| `/skip-spec`         | 继承 spec-context 语义              |

OpenSpec 原生 slash（`/opsx-propose` 等）保留，手动 override 自动 schedule。

---

## 13. 非目标

- Fork 或 patch `@fission-ai/openspec` 源码
- 修改 `openspec-*` 官方 skill 正文
- 双轨并存 `specs/active/` 与 `openspec/changes/`
- 替代 code-reviewer / review-security（仅编排委托；`references/code-reviewer/` 为分发快照作兜底，环境命中优先）

---

## 14. 实现清单

1. 创建 `.cursor/skills/auto-spec/SKILL.md`（router + continuity 表）
2. 创建 `references/workflow.md`（自 spec-context workflow 改编，路径改 openspec）
3. 创建 `references/agents-rules-template.md`（gate 模板）
4. 创建 `references/openspec-bridge.md`（CLI/skill invoke 表）
5. 创建 `commands/init.md`、`commands/migrate.md`
6. 创建 sidecar schema `.auto-spec.yaml` 模板
7. 实现 init Phase A（openspec 检测 + init --tools）
8. 实现 init Phase B（gate 注入 + skill 安装 + 桥接）
9. 编写 migrate 指南：spec-context frontmatter → change + sidecar
10. 更新本文状态为「实现中」并链接 skill 路径

---

## 15. 开放问题

- **change 与 REQ 工单映射**：一 REQ 一 change，还是长生命周期 change 多次 apply？
- **devDep vs 全局**：团队默认策略写进 init 交互还是 `.auto-spec.yaml` only？
- **与 spec-context 并存期**：vibe-skills repo 是否 deprecate spec-context 或保留为轻量替代？
