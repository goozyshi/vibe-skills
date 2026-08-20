# 轻量级 Spec 驱动开发辅助 Skill

## 1. 定位与核心原则

### 定位

为 AI 辅助开发（Cursor、Multica 等）和任意 AI 代码评审工具提供**结构化需求上下文的管理层**。它不替代 diff-review 引擎（如 OpenCodeReview），而是填补"需求一致性"检查的空白。

### 核心原则

- **Spec 是开发期工件**：服务于 code review 和 AI 编码，生命周期与代码变更绑定，而非长期文档。
- **Git 仓库为唯一真相源**：所有上下文固化在仓库文件中，不依赖任何平台的会话记忆；外部 PRD 仅作参考。
- **活跃目录最小化**：日常只操作当前活跃 spec，已交付 spec 自动归档并摘要化，避免仓库膨胀。
- **自动化优先**：通过脚本和 CI 自动维护索引、状态、归档，减少人工维护。
- **AI 友好**：使用 Markdown + frontmatter + 轻量 JSON 索引，让 AI 能快速发现、更新 spec。
- **轻量、无侵入**：基于文件约定和简单脚本，可逐步引入已有项目。
- **单人单会话**：设计为单人单 AI 会话同步操作，不支持多人或多 AI 并发修改同一 spec。

## 2. 目录结构与元数据标准

```
specs/
  active/                 # 当前活跃 spec（按模块分目录）
    _template.md          # spec 模板（不含具体需求）
  archive/                # 归档 spec（按年月）
  summaries/              # 归档摘要（保留验收标准和关键信息）
  index.json              # 活跃 spec 索引（自动生成，视为只读衍生物）
```

每个 spec 文件顶部必须包含以下 frontmatter：

```yaml
id: REQ-XXX-000 # 全局唯一，不随文件名变化
title: 需求标题
summary: 一句话描述 # 用于索引和匹配
keywords: [关键词1, 关键词2]
related_files: [src/相关文件] # 支持 glob，如 src/order/**
platforms: [common, ios, android] # 可多选
status: active # active | dev-complete | accepted | cancelled | archived
progress: 0 # 0-100，按验收标准通过比例计算
updated: 2026-08-14
dev_complete_sha: "" # dev-complete 时记录的 commit SHA，用于回退判断
rejection_count: 0 # 恢复确认衰减计数，≥3 时不再主动提示
prd_link: "" # 可选，外部 PRD 链接（仅人类参考，AI 不主动访问）
```

`index.json` 只包含 `status` 为 `active` 或 `dev-complete` 的 spec 摘要字段：`id`, `title`, `summary`, `keywords`, `path`, `status`, `progress`。体积小，AI 可一次性加载。`index.json` 视为只读衍生物，每次从文件系统全量扫描重建，不做增量写入。

## 3. Spec 文件模板（`_template.md`）

```markdown
---
id: REQ-XXX-000
title: 需求标题
summary: 一句话描述
keywords: [关键词]
related_files: [src/相关文件]
platforms: [common]
status: active
progress: 0
updated: YYYY-MM-DD
dev_complete_sha: ""
rejection_count: 0
prd_link: ""
---

# 需求标题

## 核心需求点

- [ ] 功能点（一行一条，动词开头）

## 验收标准

- [ ] 可验证的标准（一行一条）

## 范围边界（可选）

- 包含：...
- 不包含：...

## 平台差异（如无则省略）

- iOS：...
- Android：...

## 待办 / 风险（AI 自动维护）

- [ ] 未完成项或风险提示
```

**内容约束**：

- 每个功能点、验收标准只写一行，禁止段落描述。
- 背景/目标章节最多 2 行，超过则用 `prd_link` 引用外部文档。
- 文件总行数默认不超过 200 行，超过时 AI 必须提示用户拆分。

## 4. 状态机与 AI 权限限制

### 状态定义

| 状态           | 含义                      | 触发者     | 说明                           |
| -------------- | ------------------------- | ---------- | ------------------------------ |
| `active`       | 开发中                    | AI/人      | 当前正在修改                   |
| `dev-complete` | AI 声称代码完成、自测通过 | AI         | **等待人类验收，禁止自动归档** |
| `accepted`     | 人类验收通过              | **仅人类** | 才可进入归档流程               |
| `cancelled`    | 需求废弃/搁置             | **仅人类** | 移出活跃索引，归档时标记为废弃 |
| `archived`     | 已归档                    | 脚本       | 移出活跃目录，生成摘要         |

### 允许的状态转换

```
active ──→ dev-complete ──→ accepted ──→ archived
  ↑            │                │
  │            │ (review不通过   │ (验收后发现问题
  │            │  或外部修改)    │  人类回退)
  │            ▼                │
  ╰────────────╯ ◄──────────────╯

active ──→ cancelled ──→ archived（标记为废弃）
dev-complete ──→ cancelled
archived ──→ active（仅人类 reopen，从 archive/ 恢复到 active/ 并重新纳入索引）
```

### 关键限制

- AI 永远不能将状态改为 `accepted` 或 `cancelled`。只有用户明确说出"通过""确认""没问题"等验收指令后，AI 才修改为 `accepted`；用户说"不做了""取消""废弃"时改为 `cancelled`。
- 当 AI 将状态设为 `dev-complete` 时，必须同时记录 `dev_complete_sha`（当前 HEAD commit），并在"待办/风险"章节列出可能遗漏点。
- Review 循环期间状态保持 `active`，只有最终 review 通过才转为 `dev-complete`。

### progress 与 status 一致性约束

| 状态转换目标   | progress 约束           |
| -------------- | ----------------------- |
| `dev-complete` | 必须 ≥ 90（或强制 100） |
| `accepted`     | 必须 = 100              |
| `cancelled`    | 无约束                  |

若 `progress = 100` 且 `status = active`，AI 应主动询问用户是否进入 review 流程。

### progress 评估公式

`progress = (已勾选验收标准数 / 总验收标准数) × 100`，四舍五入到整数。AI 不得凭主观感觉赋值。

### 并发边界

本系统设计为**单人单 AI 会话同步操作**，不支持多人或多 AI 并发修改同一 spec。团队协作场景下，通过 Git 分支隔离不同 spec 的修改，合并时若 frontmatter 冲突，以 `status` 值更高优先级为准（`accepted > dev-complete > active`），`progress` 取 `max`。建议在 `.gitattributes` 中将 `index.json` 标记为 `merge=ours`，冲突时重新运行生成脚本。

## 5. 变更分级与处理策略（L0/L1/L2）

**目的**：避免琐碎改动频繁触发 spec 读取和 review，节省 token。

| 等级   | 定义                                        | 典型场景                                   | Spec 策略              | Review 策略         |
| ------ | ------------------------------------------- | ------------------------------------------ | ---------------------- | ------------------- |
| **L0** | 仅 UI 表现层变更，不涉及逻辑                | 改文案、调颜色/间距/字号、改静态图片       | 完全不读               | 不触发              |
| **L1** | 局部逻辑变更，不改用户可感知行为或 API 契约 | 修 bug、加判空、重构内部实现、优化算法     | 只读 `index.json` 摘要 | 轻量自查（见下文）  |
| **L2** | 改变用户可感知行为或 API 契约               | 新增功能、修改交互流程、改 API 字段/返回值 | 读取/更新完整 spec     | 自动触发完整 review |

### 硬判断规则（AI 必须遵循）

```
if 改动仅涉及 CSS/样式/文案/注释/文档 → L0
if 改动文件在任一 active spec 的 related_files 中 → 至少 L1
if 改动涉及以下任一项 → 至少 L2：
  - 新增/删除文件
  - API 字段、路由、函数签名变更
  - 数据库 schema / migration
  - 配置文件（路由、权限、环境变量）
  - 新增/变更依赖（package.json, Podfile 等）
  - 状态管理 store 结构变更
  - 安全相关代码（认证、加密、权限判断）
  - 新增/删除组件 export
if 不确定 → 按 L1 处理，读 index 后再判断是否升级
```

### 运行时升级

AI 在执行过程中发现改动复杂度超出初始判断（如 L0 实际需要改逻辑、L1 发现涉及 spec 关键词），必须暂停、重新加载 spec、升级到对应等级后继续。

### L1 轻量自查

L1 不生成全量 review 报告，但必须完成以下自查：

1. 检查改动文件是否在任一 spec 的 `related_files` 中，若是则简要确认不影响 spec 验收标准。
2. 一句话汇报"改了什么、预期影响"。
3. 若发现改动实际影响了用户可感知行为，升级为 L2。

### 用户 Override

用户可通过 `/skip-spec` 命令跳过当前改动的 spec 流程（等效强制 L0）。AI 记录跳过事实但不阻拦。

## 6. 自动 Code Review 闭环

**触发时机**：仅 L2 变更完成后自动触发，无需用户手动要求。

### Review 能力复用

Spec 系统的 review 分为两层：**需求一致性检查**（spec 验收标准逐条对照）和**代码质量检查**（SOLID、安全、性能等）。代码质量检查不重造轮子，优先委托给已有 skill：

| 检查类型   | 优先使用                                    | 回退方案         |
| ---------- | ------------------------------------------- | ---------------- |
| 需求一致性 | spec 系统内置（验收标准逐条对照）           | —                |
| 代码质量   | `code-reviewer` skill（若存在）             | 内置基础检查     |
| 安全审查   | `review-security` / bugbot（若存在）        | 跳过             |
| 合并冲突   | `resolving-merge-conflicts` skill（若存在） | 提示用户手动处理 |

委托逻辑：AI 先完成需求一致性检查，然后调用已发现的 skill 执行代码质量/安全检查，最终合并两份报告。若 skill 的问题级别（如 P0/P1）与 spec 的阻塞/警告级别需要映射，规则为：`P0/P1 → 阻塞，P2 → 警告，P3 → 建议`。

### Diff 基准

- **代码 diff**：对比当前分支创建时的 base commit（`git merge-base`）。
- **Spec diff**：对比 spec 文件在 base commit 时的版本。若 spec 是新建的，则整个文件视为 diff。
- Review 触发前，AI 必须确保 spec 已更新完毕（spec 更新是 review 的前置条件）。

### 流程

1. AI 完成代码实现后，收集 spec diff 和代码 diff（基准见上）。
2. 读取 spec 中的验收标准章节，逐条对照检查。
3. 检查代码是否引入 spec 之外的行为、是否有遗漏的验收标准、平台适配情况。
4. 生成结构化 review 报告（通过/未通过检查表、问题列表）。
5. 若存在**阻塞级**问题，AI 继续修改并重新 review。**最多迭代 3 次**。
6. 若 3 次迭代后仍有未解决的阻塞项，AI 将状态设为 `dev-complete`（标记为"部分通过"），在报告中列出未解决项，交由用户决策。
7. 全部通过后，AI 将 spec 状态设为 `dev-complete`，记录 `dev_complete_sha`，向用户展示报告，等待验收。

### Review 去重

避免对相同代码状态重复 review，节省 token：

- 若当前 `git rev-parse HEAD` 等于 spec 的 `dev_complete_sha`，且 spec 未从 `dev-complete` 回退为 `active` → 跳过 review，告知用户"代码未变化，沿用上次 review 结果"。
- 手动 `/review` 始终执行（用户明确要求覆盖去重）。
- 自动触发的 L2 review 遵循去重规则。

### 迭代终止保护

- 若本轮问题数 ≥ 上一轮（问题不收敛），立即终止迭代，上报用户。
- 每次迭代记录变更摘要，防止来回振荡（改 A 破 B → 改 B 破 A）。

### Review 问题分级

| 级别     | 含义                                            | 处理                 |
| -------- | ----------------------------------------------- | -------------------- |
| `[阻塞]` | 验收标准未实现、可能导致线上异常                | 必须修复才能通过     |
| `[警告]` | 有风险但不阻塞（缺少边界处理、缺少 loading 态） | 建议修复，不阻塞通过 |
| `[建议]` | 优化项（命名、代码风格、性能）                  | 可延后处理           |

判定规则：验收标准未实现 = 阻塞；可能导致线上异常 = 阻塞；缺少边界/异常处理 = 警告；其余 = 建议。

### Review 报告格式示例

```markdown
## Code Review 报告

### 需求摘要

- Spec: REQ-ORDER-001 订单取消
- 变更: 增加取消原因选项，增加二次确认
- 迭代: 第 1 次（共 1 次）

### 代码变更

- src/order/cancel.ts: 新增取消原因枚举，添加确认对话框逻辑
- src/components/CancelModal.tsx: 新增确认弹窗组件

### 验收标准检查

| #   | 验收标准                 | 状态      | 说明                          |
| --- | ------------------------ | --------- | ----------------------------- |
| 1   | 用户点击取消弹出确认框   | ✅ 通过   | CancelModal 已实现            |
| 2   | 确认后状态变为 cancelled | ✅ 通过   | cancel() 方法已更新           |
| 3   | 取消原因包含"商品缺货"   | ✅ 通过   | 枚举已添加                    |
| 4   | 取消后自动退款           | ❌ 未实现 | spec 中有此要求，但代码未涉及 |

### 问题列表

- [阻塞] 验收标准 4 未实现：缺少退款触发逻辑
- [警告] CancelModal 组件缺少加载状态处理

### 结论

- 不通过：存在 1 个阻塞项，需补充退款逻辑。
```

## 7. 跨平台上下文恢复与断点续传

**问题**：用户在平台 A 完成部分需求，然后拉取代码到平台 B 继续开发，AI 可能无法恢复上下文。

**解决方案**：

- **恢复优先级**：先读 `specs/index.json`，后参考聊天历史。spec 文件为仓库唯一真相源，聊天记录仅为辅助证据。
- spec 中维护 `progress` 字段和"待办/风险"章节，AI 每次修改后自动更新。
- 当新平台 AI 启动并读取 `index.json` 时，若发现存在 `active` 且 `progress < 100` 或 `dev-complete` 状态的 spec，且用户指令与之相关，则自动加载该 spec，向用户确认是否继续。
- 若用户指令与 spec 无关，则不打扰，按正常流程处理。

### dev-complete 回退机制

当 AI 检测到 `dev-complete` 状态的 spec，通过对比 `dev_complete_sha` 与当前 HEAD 判断关联文件是否被修改：

```
if git diff <dev_complete_sha>..HEAD -- <related_files> 有非空输出 → 回退为 active
```

不再依赖 `git status`（避免格式化、IDE 自动保存等误触发）。AI 自身在 `dev-complete` 后的改动（如 lint fix）不触发回退——判断方法：若 diff 中所有 commit 的 message 包含 spec id，视为系统内改动，不回退。

### 恢复确认衰减

避免"确认疲劳"：

- AI 每次启动最多对同一 spec 提示 1 次。
- 用户拒绝继续后，该 spec 本次会话内不再提示。
- 若某 spec 连续 3 次会话被拒绝，AI 不再主动提示（仍可通过 `/find-spec` 或 `/status` 手动查看）。
- 用户可随时通过 `/context <spec-id>` 手动指定当前上下文，覆盖 AI 判断。

**衰减计数持久化**：拒绝计数存储在 spec frontmatter 的 `rejection_count` 字段中（默认 0）。AI 每次被拒后递增此字段并提交更新。该字段随 spec 文件一起进入 Git，跨平台自然同步。当用户通过 `/context` 主动恢复 spec 时，`rejection_count` 重置为 0。

### "无关"判断规则

AI 判断用户新指令是否与当前 spec 相关的规则：

```
if 用户指令中提及的文件 ∩ spec.related_files 非空 → 相关
if 用户指令中的关键词 ∩ spec.keywords 非空 → 相关
if 以上均不匹配 → 视为无关，重置上下文
if 不确定 → 向用户确认"这个改动是否属于 REQ-xxx？"，不自动决策
```

**效果**：无论在哪台机器、哪个平台，只要仓库完整，AI 都能在 1 秒内恢复上下文。

## 8. 防 Spec 膨胀与防过度自信

**防膨胀**：

- 模板强制要点化，每个功能点/验收标准只写一行，禁止段落。
- 背景/目标章节最多 2 行，超过则用 `prd_link` 引用外部文档。
- 若文件超过 200 行或 10 个需求点，AI 必须提示用户拆分。
- 生命周期自动清理：已交付的 spec 归档后移出活跃目录，只保留摘要。

**防过度自信**：

- 状态机强制区分 `dev-complete` 与 `accepted`。
- AI 在标记 `dev-complete` 时，必须列出风险点或未覆盖边界。
- Review 最多迭代 3 次，问题不收敛时终止并上报。
- 用户验收后才能进入归档，确保需求真正被人类确认。

## 9. 初始化与命令路由

### 零配置初始化

用户执行 `/init` 或 AI 自动检测缺少 `specs/` 目录时触发。

**幂等性保证**：

- 目录已存在 → 跳过创建。
- `_template.md` 已存在 → 跳过，不覆盖。
- `AGENTS.md` 注入采用三态检测（注入薄 gate，非完整 workflow）：
  - **ready**：标记存在且内容与当前模板一致 → 跳过。
  - **needs-inject**：文件不存在或无标记 → 追加 spec 规则段落（以 `<!-- spec-system-start -->` / `<!-- spec-system-end -->` 标记包裹），不覆盖已有内容。
  - **conflict**：标记存在但内容与模板不一致（用户在标记间添加了自定义规则）→ 展示差异，询问用户"覆盖/合并/跳过"，不自动覆盖。
- 脚本已存在 → 对比版本号，仅在新版本时更新。
- 输出报告告知用户"跳过了什么、新增了什么、发现了哪些可复用 skill"。

### Skill 发现与复用

**运行时发现，不持久化**。Skill 路径是本地环境相关的，持久化到仓库会在跨平台时失效。每次 AI 会话启动时动态扫描，零成本。

扫描路径（按优先级，靠前的覆盖靠后的同名 skill）：

```
1. <workspace>/.cursor/skills/
2. <workspace>/.agents/skills/
3. ~/.cursor/skills-cursor/
4. ~/.agents/skills/
```

发现逻辑：读取每个 `SKILL.md` 的 frontmatter（`name`、`description`），按关键词匹配映射到 spec 系统角色：

| Spec 系统角色   | 匹配关键词                    | 示例 skill                  |
| --------------- | ----------------------------- | --------------------------- |
| 代码质量 review | `code-review`, `reviewer`     | `code-reviewer`             |
| 安全审查        | `security`, `review-security` | `review-security`           |
| Bug 检测        | `bugbot`, `bug`               | `review-bugbot`             |
| 合并冲突        | `merge-conflict`, `resolve`   | `resolving-merge-conflicts` |

- 未找到匹配 skill 的角色 → 回退到 spec 系统内置能力（需求一致性检查始终内置，不依赖外部 skill）。
- 发现结果仅在内存中持有，随会话结束释放。
- `/init` 时输出发现报告，让用户知道当前环境有哪些 skill 可被复用。

### 命令路由

命令放在 `commands/` 目录，每个命令是一个 **AI prompt 模板**（`.md` 文件）。AI 识别到斜杠命令后，读取对应 prompt 并按指令执行。`commands/` 面向用户交互路由，`scripts/` 面向自动化后台任务。

| 命令            | 功能                                |
| --------------- | ----------------------------------- |
| `/init`         | 初始化仓库结构（幂等）              |
| `/prd-to-spec`  | 将用户口述或 PRD 内容转为 spec      |
| `/find-spec`    | 查找已有 spec                       |
| `/review`       | 手动触发 code review                |
| `/archive`      | 手动归档                            |
| `/status`       | 查看当前活跃需求状态                |
| `/skip-spec`    | 跳过当前改动的 spec 流程（强制 L0） |
| `/context <id>` | 手动指定当前 spec 上下文            |

用户按需调用，未调用的命令不会影响核心流程。

### `/prd-to-spec` 输入方式

支持两种输入：

1. **聊天窗口直接输入**：用户在对话中口述或粘贴需求文本，AI 提取要点生成 spec。
2. **指定仓库内文件**：`/prd-to-spec path/to/prd.md`，AI 读取文件内容后提取。

不支持 URL 抓取（AI 通常无可靠网络访问）。若输入超过 200 行，AI 先提取摘要和功能点清单，用户确认后再生成 spec。`prd_link` 字段仅作人类参考链接，AI 不主动访问。

## 10. AGENTS.md gate + skill workflow

隐式行为分两层，避免 AGENTS.md 膨胀：

| 层 | 位置 | 加载时机 | 内容 |
| ---- | ---- | -------- | ---- |
| **Gate** | `AGENTS.md`（`<!-- spec-system-start/end -->`） | 每会话常驻 | 4 条 continuity gates + skill 路径 |
| **Workflow** | `.cursor/skills/spec-context/references/workflow.md` | gate 触发后 | L0/L1/L2、状态机、recover、skill 发现等 |

Gate 模板见 skill 内 `references/agents-rules-template.md`。Continuity 命令：`level`、`setup`、`start`、`check`、`review`、`recover`。

### 与已有规则的共存

- Gate 写入 `AGENTS.md`（Cursor 标准约定），workflow 留在 skill 内。
- 若项目已有 `AGENTS.md`，gate 以独立段落追加，用 HTML 注释标记边界。
- 系统自动操作例外（index 重建、L2 自动 review）写在 workflow.md，不受 RIPER-5 EXECUTE 限制。

## 11. 工具脚本与 CI 集成

| 脚本                         | 功能                                                       | 调用方式                    |
| ---------------------------- | ---------------------------------------------------------- | --------------------------- |
| `generate-spec-index.js`     | 扫描 `specs/active/` 生成 `index.json`                     | AI 每次修改 spec 后自动运行 |
| `archive-delivered-specs.js` | 将 `accepted`/`cancelled` 且超过阈值的 spec 归档并生成摘要 | 定时任务或手动运行          |
| `check-association.js`       | CI 中检查代码变更是否有关联 spec                           | PR 时自动运行               |

### 脚本容错

- 运行时要求：Node.js >= 18，无第三方依赖（仅用 fs/path/glob）。
- `generate-spec-index.js` 失败时：保留旧 `index.json` 不覆盖，输出 stderr 警告。AI 检测到脚本失败后应通知用户。
- `archive-delivered-specs.js` 使用事务式操作：先复制到 archive/ → 生成摘要 → 确认完整后才删除 active/ 中的原文件。任一步失败则回滚。
- 所有脚本支持幂等重复运行。

### check-association 匹配逻辑

1. 收集 PR 中所有变更文件路径。
2. 用 `related_files`（支持 glob）做前缀/模式匹配。
3. 用 `keywords` 匹配 PR title 和 commit message（不匹配 diff 内容，避免噪音）。
4. 匹配结果行为：
   - 无匹配：输出 info 级提示"未找到关联 spec"，**不阻断 PR**。
   - 匹配到 active spec：输出 warning"关联 spec REQ-xxx 仍在开发中，请确认是否需要更新"。
   - 匹配到 dev-complete spec：输出 info"关联 spec REQ-xxx 已完成开发，等待验收"。

### CI 集成

- PR 合并到 main 后，CI 检查关联 spec 状态。若 spec 为 `dev-complete`，CI **仅发提醒**（comment 或通知）"REQ-xxx 等待验收，请确认是否 accepted"，**不自动修改状态**。`accepted` 始终由人类手动标记。
- 定时任务运行归档脚本，将 `accepted` 超过 14 天或 `cancelled` 超过 7 天的 spec 移入 `archive/` 并生成摘要。
- 归档目录按 `archive/YYYY-MM/` 组织，保留 6 个月，更早的摘要文件保留、原文件删除（Git 历史保留全文）。

### 归档摘要模板

摘要文件保存在 `specs/summaries/`，文件名为 `{spec-id}.summary.md`：

```markdown
---
id: REQ-XXX-000
title: 需求标题
summary: 一句话描述
keywords: [关键词]
related_files: [src/相关文件]
status: archived # 或 cancelled
accepted_date: YYYY-MM-DD # cancelled 则为 cancelled_date
archived_date: YYYY-MM-DD
---

## 验收标准（完整保留）

- [x] 标准 1
- [x] 标准 2

## 核心需求点（缩减为一行列表）

- 功能点 1、功能点 2、功能点 3
```

摘要强制保留：id、title、summary、keywords、related_files、验收标准全文。丢弃：范围边界、平台差异、待办/风险等开发期章节。

## 12. 典型场景流程

**场景一：用户口述新需求**
用户描述 → AI 判定 L2（硬规则匹配） → 检索 index 无匹配 → 生成精简 spec → 询问关键缺失信息 → 用户确认 → 开发 → 自动 review（最多 3 轮） → dev-complete → 用户验收 → accepted → 归档。

**场景二：小改动（改文案）**
用户说"把按钮文字改成确认" → AI 判定 L0（仅 UI 文案） → 直接改代码 → 汇报，不碰 spec。

**场景三：跨平台接力**
平台 A 完成 80%，进度写入 spec → 用户拉到平台 B → 用户提出相关改动 → AI 读取 index 发现未完成需求（keywords/related_files 匹配） → 加载 spec 并向用户确认 → 继续完成 → 更新进度和待办。

**场景四：用户"偷懒"修 bug**
用户在 A 需求后直接说"修首页 loading" → AI 检查：指令关键词 ∩ spec.keywords 为空，涉及文件 ∩ related_files 为空 → 判定无关 → 重置上下文 → 判定 L1 → 读 index 摘要确认无影响 → 直接改代码 → 不碰 spec。

**场景五：需求废弃**
用户说"这个需求不做了" → AI 确认 spec id → 将状态改为 `cancelled` → 移出活跃关注 → 定时归档。

**场景六：用户跳过 spec 流程**
用户说 `/skip-spec` 然后改代码 → AI 记录跳过 → 按 L0 处理 → 不读 spec、不触发 review。

## 13. 与现有工具的关系

- **OpenCodeReview 等 diff-review 工具**：我们提供需求上下文，让它们能同时检查需求一致性；或使用我们内置的轻量需求检查作为兜底。
- **OpenSpec 等需求管理工具**：我们专注于 AI 开发循环内的实时上下文管理，不追求正式审批流程；可与它们共存，我们作为上层控制或使用其存储格式。

## 附录：效果评估方法（可选）

**核心假设**：

- H1：使用 spec 机制后，code review 能发现更多需求遗漏，减少上线后的需求缺陷。
- H2：虽然 AI 读取 spec 增加了显性 token 成本，但通过减少沟通和返工的隐性成本，整体 review 流程效率提升（需数据验证净收益）。
- H3：跨平台/跨会话的需求上下文恢复更快。

**方法**：

- 前后对比或 A/B 测试。
- 指标：需求相关缺陷检出数、缺陷逃逸率、AI review token 消耗、人工修正 commit 次数、跨平台恢复时间。
- 小规模试点（5-10 个需求）快速验证。
