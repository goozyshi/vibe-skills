# Auto-Spec Workflow

AGENTS.md gate 触发后加载本文。Slash 命令见 [commands/](../commands/)。CLI 调用与工具 invoke 见 [openspec-bridge.md](openspec-bridge.md)；sidecar 字段见 [sidecar-schema.md](sidecar-schema.md)。

## Continuity 命令

| 命令      | 时机                     | 章节                   |
| --------- | ------------------------ | ---------------------- |
| `level`   | 任何 in_scope 代码改动前 | [#level](#level)       |
| `setup`   | L2 且无 active change    | [#l2-setup](#l2-setup) |
| `start`   | L2 且有 active change    | [#l2-start](#l2-start) |
| `check`   | in_scope 代码落地后      | [#check](#check)       |
| `review`  | check 基本通过后         | [#review](#review)     |
| `recover` | 新会话启动               | [#recover](#recover)   |

下文中 `<openspec>` 指按 [openspec-bridge.md](openspec-bridge.md#invoke-解析) 解析出的调用前缀。

---

## level

**判据——行为漂移**：改动是否新增/改变/删除可感知行为契约。spec 已覆盖 → 对照 spec 判；spec 未覆盖 → 新增/改变可感知行为即漂移（L2，提案顺便建立 spec 基线）。bugfix（对齐预期行为）、行为不变的纯重构、补测试不算漂移。

```
L0（无漂移，直接改）：
  - 样式/文案/错字/格式/注释/文档
  - 修 bug —— 对齐 spec 或预期行为，不是改契约
    （修复复杂或想留决策记录 → 可自愿升 L2）
  - 非破坏性依赖更新
  - 不改变行为的配置调整（含 CI、日志级别）
  - 为现有行为补测试
  - 行为不变的纯内部重构
  - 新增日志/监控埋点、删除死代码

L1（可能触碰行为契约，需对照）：
  - 改动文件在任一 active change sidecar 的 related_files 中
  - 共享/公共模块改动，且「行为不变」难自证
  - 纯性能 migration（如仅加索引）
  - 不确定 → 按 L1，对照 change 列表后再判升降

L2（漂移，需要提案）：
  - spec 已覆盖时命中信号清单：
    新增/删除文件、API 字段/路由/函数签名变更、
    数据库 schema / 行为性 migration、breaking 依赖变更、
    改变行为的配置、store 结构变更、安全逻辑、组件 export 增删（含纯类型）
  - 或 spec 未覆盖时的新增/改变可感知行为（含 feature flag 上线）
```

**「难自证」客观化**（不依赖自觉）：改动文件被 ≥ 3 个模块引用，或改动区域无测试覆盖 → 自动 L1。

| 标签         | 动作                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| `[Spec: L0]` | 直接改代码                                                                 |
| `[Spec: L1]` | `<openspec> list --json` 读 active change 摘要，确认不影响验收，一句话汇报 |
| `[Spec: L2]` | 执行 `setup` 或 `start`，再写 in_scope 代码                                |

L1 发现影响可感知行为 → 升级为 L2。执行中复杂度超出初始判断 → 暂停、重新加载 change、升级后继续。

用户 `/skip-spec` → 强制 L0，记录跳过事实。

---

## l2-setup

无 active change 时，写 in_scope 代码之前：

1. `<openspec> list --json`，按 sidecar 的 `related_files` / `keywords` 查找关联 change。
2. 未找到 → 桥接 OpenSpec propose 流程（见 [openspec-bridge.md](openspec-bridge.md#propose-桥接)）：从用户消息提取标题、功能点、验收标准，生成 `openspec/changes/<name>/` 的 proposal / tasks / delta specs。PRD 清晰 → 跳过 explore，**不跳过** propose。
3. 写入 sidecar `openspec/changes/<name>/.auto-spec.yaml`（`status: active`，填 `related_files`、`keywords`）。
4. 展示 change 摘要，附注「change 已自动创建，实现完成后将按此验收。如需调整随时告知。」

只提取用户明确提到的内容，不添加推测。关键缺失信息放入 proposal「待确认」并询问用户。

**Completion criterion**：回复点名 `openspec/changes/<name>/`，且 apply 所需 artifact 均就绪。

---

## l2-start

有 active change 时：

1. 读 `openspec/changes/<name>/`（proposal、tasks、delta specs）与 sidecar。
2. 按 tasks 实现；勾选 tasks 复选框，随进度更新 sidecar `updated`。

---

## check

in_scope 代码落地后，对照 change 内验收（tasks + delta specs）逐条检查。输出简表：

```
| # | 验收标准 | 状态 | 说明 |
```

基本满足 → 同轮自动执行 `review`。纯文档/格式任务 → 在 sidecar 记录 `review_skipped_reason`，不触发 review。

---

## review

**必须派独立子代理执行审查**——实现 agent 不自审。子代理带全新上下文，输入为代码 diff + change 验收（tasks / delta specs），输出问题清单。

1. `<openspec> validate <name> --strict --json` 收集结构校验结果（只查结构，不作审查结论）。
2. 派独立子代理，任务含：
   - 需求一致性：逐条对照 tasks / delta specs 与代码 diff。
   - 代码质量：按 [#skill-discovery](#skill-discovery) 解析指令来源——环境命中的 review skill 优先，无命中用内置 [code-reviewer 快照](code-reviewer/SKILL.md)。**不允许跳过**。
3. 子代理只输出发现项，不实施修复（跳过 code-reviewer 第 7 步的确认交互）；修复由实现 agent 执行。问题级别映射：`P0/P1 → 阻塞，P2 → 警告，P3 → 建议`。
4. 有阻塞项 → 修复后重新派子代理审查，最多 3 轮；本轮问题数 ≥ 上一轮 → 不收敛，立即终止上报。
5. 通过 → sidecar 设 `status: dev-complete`，记录 `dev_complete_sha`（当前 HEAD）。

去重：`HEAD == dev_complete_sha` 且未回退 → 跳过，告知「代码未变化，沿用上次 review 结果」。

---

## L2 完成格式

L2 实现完成时，回复必须以两段结尾：

```
## 验收检查
| # | 验收标准 | 状态 | 说明 |

## 代码质量检查
（独立子代理审查结果，注明所用 skill 或「通用标准」）

结论：通过 / 不通过（N 个阻塞项）
```

两段均由独立子代理产出，实现 agent 只汇总，不自审。

---

## 状态机

状态存于 sidecar，**不是** OpenSpec 原生字段：

```
active → dev-complete → accepted → archived
active → cancelled
dev-complete → active（review 不通过或外部修改）
```

- AI 可设：`active`、`dev-complete`
- AI **禁止**设：`accepted`、`cancelled`（仅人类）
- `dev-complete` 要求 tasks 勾选 ≥ 90%；`accepted` 要求 = 100%
- archive 走 `<openspec> archive`；sidecar `accepted` 是 archive 前的 schedule 层门禁

dev-complete 回退：`git diff <dev_complete_sha>..HEAD -- <related_files>` 非空 → 回退 `active`。

---

## recover

**优先级：先读 `<openspec> list --json` 与各 sidecar，后参考聊天历史。**

```
if 用户指令文件 ∩ sidecar.related_files 非空 → 相关，加载并确认是否继续
if 用户指令关键词 ∩ sidecar.keywords 非空 → 相关，加载并确认是否继续
if 均不匹配 → 视为无关，不打扰
if 不确定 → 确认「这个改动是否属于 change <name>？」
```

衰减：同一 change 每会话最多提示 1 次；拒绝后本会话不再提示，并递增 sidecar `rejection_count`；`rejection_count ≥ 3` 不再主动提示。

---

## skill-discovery

Review 子代理的指令来源，运行时扫描（不持久化）：

```
1. <workspace>/.cursor/skills/
2. <workspace>/.agents/skills/
3. ~/.cursor/skills-cursor/
4. ~/.agents/skills/
5. 内置兜底：<workspace>/.cursor/skills/auto-spec/references/code-reviewer/
```

| 角色     | 匹配关键词                    | 无命中时                |
| -------- | ----------------------------- | ----------------------- |
| 代码质量 | `code-review`, `reviewer`     | 内置 code-reviewer 快照 |
| 安全     | `security`, `review-security` | 内置快照的安全清单      |
| Bug      | `bugbot`, `bug`               | 内置快照的质量清单      |

环境命中优先于内置快照——用户自己维护的 code-reviewer 永远赢；内置副本是分发快照，不手改，漂移靠环境版覆盖。skill 决定子代理**怎么审**，不决定**审不审**。

---

## 系统自动操作

以下不受 RIPER-5 EXECUTE「未经用户要求不修改文件」限制：

- L2 完成后自动 `review`
- 随开发进度勾选 tasks、更新 sidecar `status` / `updated`
