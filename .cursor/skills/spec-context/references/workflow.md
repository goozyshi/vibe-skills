# Spec Context Workflow

AGENTS.md gate 触发后加载本文。Slash 命令见 [commands/](../commands/)。

## Continuity 命令

| 命令 | 时机 | 章节 |
|------|------|------|
| `level` | 任何 in_scope 代码改动前 | [#level](#level) |
| `setup` | L2 且无关联 spec | [#l2-setup](#l2-setup) |
| `start` | L2 且有关联 spec | [#l2-start](#l2-start) |
| `check` | in_scope 代码落地后 | [#check](#check) |
| `review` | check 基本通过后（或手动 `/review`） | [review.md](../commands/review.md) |
| `recover` | 新会话启动 | [#recover](#recover) |

---

## 目录与元数据

Spec 位于 `specs/active/`（按模块分子目录）。frontmatter 必填：`id`、`title`、`summary`、`keywords`、`related_files`、`platforms`、`status`、`progress`、`updated`。

`specs/index.json` 是只读衍生物，由 `node specs/scripts/generate-spec-index.js` 重建。

---

## level

每次代码改动前判定：

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

| 标签 | 动作 |
|------|------|
| `[Spec: L0]` | 直接改代码 |
| `[Spec: L1]` | 读 `specs/index.json` 摘要，确认不影响验收标准，一句话汇报 |
| `[Spec: L2]` | 执行 `setup` 或 `start`，再写 in_scope 代码 |

L1 发现影响可感知行为 → 升级为 L2。执行中复杂度超出初始判断 → 暂停、重新加载 spec、升级后继续。

用户 `/skip-spec` → 强制 L0，记录跳过事实。

---

## l2-setup

无关联 spec 时，写 in_scope 代码之前：

1. 读 `specs/index.json`，按 `related_files` 或 `keywords` 查找。
2. 未找到 → 从用户消息提取 spec（标题、功能点、验收标准、`related_files`），保存到 `specs/active/`。
3. 运行 `node specs/scripts/generate-spec-index.js`。
4. 展示 spec 摘要，附注「spec 已自动创建，实现完成后将按此验收。如需调整随时告知。」

只提取用户明确提到的内容，不添加推测。关键缺失信息放入「待确认」并询问用户。

也可走 `/prd-to-spec` — 见 [prd-to-spec.md](../commands/prd-to-spec.md)。

---

## l2-start

有关联 spec 时：

1. 加载完整 spec。
2. 按 spec 实现；随进度更新 `progress`、`status`、`updated` 与「待办/风险」。

---

## check

in_scope 代码落地后，对照 spec「验收标准」逐条检查。输出简表：

```
| # | 验收标准 | 状态 | 说明 |
```

基本满足 → 同轮自动执行 `review`。纯文档/格式任务 → 在 spec「待办/风险」记录 `review_skipped_reason`，不触发 review。

---

## L2 完成格式

L2 实现完成时，回复必须以两段结尾：

```
## 验收检查
| # | 验收标准 | 状态 | 说明 |

## 代码质量检查
（委托 code review 相关 skill，或「未发现可用 review skill，跳过」）

结论：通过 / 不通过（N 个阻塞项）
```

先验收一致性，再委托代码质量 skill。有阻塞项 → 修复并重跑，最多 3 轮（见 review 命令）。

---

## 状态机

```
active → dev-complete → accepted → archived
active → cancelled → archived
dev-complete → active（review 不通过或外部修改）
dev-complete → cancelled（仅人类）
accepted → active（人类回退）
archived → active（仅人类 reopen）
```

- AI 可设：`active`、`dev-complete`
- AI **禁止**设：`accepted`、`cancelled`
- `dev-complete` 时记录 `dev_complete_sha`（当前 HEAD），「待办/风险」列出可能遗漏
- `progress = (已勾选验收标准 / 总验收标准) × 100`，四舍五入；AI 不得主观赋值
- `dev-complete` 要求 progress ≥ 90；`accepted` 要求 = 100
- `progress = 100` 且 `status = active` → 询问是否进入 review

dev-complete 回退：`git diff <dev_complete_sha>..HEAD -- <related_files>` 非空 → 回退 `active`。commit message 含 spec id 的系统内改动不回退。

---

## recover

**优先级：先读 `specs/index.json`，后参考聊天历史。**

```
if 用户指令文件 ∩ spec.related_files 非空 → 相关，加载并确认是否继续
if 用户指令关键词 ∩ spec.keywords 非空 → 相关，加载并确认是否继续
if 均不匹配 → 视为无关，不打扰
if 不确定 → 确认「这个改动是否属于 REQ-xxx？」
```

衰减：同一 spec 每会话最多提示 1 次；拒绝后本会话不再提示；`rejection_count ≥ 3` 不再主动提示。拒绝后递增 `rejection_count`。`/context <id>` 恢复时重置为 0。

---

## skill-discovery

Review 时代码质量检查委托运行时发现的 skill（不持久化）：

扫描路径（优先级从高到低）：

```
1. <workspace>/.cursor/skills/
2. <workspace>/.agents/skills/
3. ~/.cursor/skills-cursor/
4. ~/.agents/skills/
```

| 角色 | 匹配关键词 | 回退 |
|------|-----------|------|
| 代码质量 | `code-review`, `reviewer` | 跳过 |
| 安全 | `security`, `review-security` | 跳过 |
| Bug | `bugbot`, `bug` | 跳过 |
| 合并冲突 | `merge-conflict`, `resolve` | 提示手动 |

映射：`P0/P1 → 阻塞，P2 → 警告，P3 → 建议`。

---

## 防膨胀

- 功能点/验收标准一行一条，禁止段落
- 背景/目标最多 2 行，超出用 `prd_link`
- 超过 200 行或 10 个需求点 → 提示拆分

---

## 系统自动操作

以下不受 RIPER-5 EXECUTE「未经用户要求不修改文件」限制：

- 修改 spec 后运行 `node specs/scripts/generate-spec-index.js`
- L2 完成后自动 `review`
- 随开发进度更新 spec 的 `progress`、`status`、`updated`
