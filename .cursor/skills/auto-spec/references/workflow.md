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

下文中 `<openspec>` 指按 [openspec-bridge.md](openspec-bridge.md#版本与调用) 解析出的调用前缀。
`<state-file>` 为项目根目录的 `.auto-spec/changes/<name>.yaml`。它只存 schedule 状态；OpenSpec 工件仍由 engine 管理。

---

## level

**判据——行为漂移**：改动是否新增/改变/删除可感知行为契约；受众包括产品用户、开发者、Agent 与 CI。spec 已覆盖 → 对照 spec 判；spec 为空只表示没有基线，不降低等级。新增/改变可感知行为即 L2，提案顺便建立基线。bugfix（对齐预期行为）、行为不变的纯重构、补测试不算漂移。

```
L0（无漂移，直接改）：
  - 样式/文案/错字/格式/注释/文档
  - 修 bug —— 代码错、spec 对，改代码贴 spec
    （spec 本身过时 → 见 [#spec-漂移](#spec-漂移)；修复复杂或想留决策记录 → 可自愿升 L2）
  - 非破坏性依赖更新
  - 不改变行为的配置调整（含 CI、日志级别）
  - 为现有行为补测试
  - 行为不变的纯内部重构
  - 新增日志/监控埋点、删除死代码

L1（可能触碰行为契约，需对照）：
  - 改动文件在任一 active change sidecar 的 related_files 中
  - 改动值与现有 spec 记录值不一致 → 对照后按 [#spec-漂移](#spec-漂移) 分流
  - 共享/公共模块改动，且「行为不变」难自证
  - 纯性能 migration（如仅加索引）
  - 不确定 → 按 L1，对照 change 列表后再判升降

L2（漂移，需要提案）：
  - spec 已覆盖时命中信号清单：
    可感知工件的新增/删除、API 字段/路由/函数签名变更、
    数据库 schema / 行为性 migration、breaking 依赖变更、
    改变行为的配置、store 结构变更、安全逻辑、组件 export 增删（含纯类型）、
    Agent skill / rule / CI / 构建自动化能力增删或行为改变
  - 或 spec 未覆盖时的新增/改变可感知行为（含 feature flag 上线）
```

**「难自证」客观化**（不依赖自觉）：改动文件被 ≥ 3 个模块引用，或改动区域无测试覆盖 → 自动 L1。

| 标签         | 动作                                                            |
| ------------ | --------------------------------------------------------------- |
| `[Spec: L0]` | 直接改代码                                                      |
| `[Spec: L1]` | 只读探针：对照 active change、spec 与引用；不得写 in_scope 文件 |
| `[Spec: L2]` | 执行 `setup` 或 `start`，再写 in_scope 代码                     |

L1 完成后必须在写入前显式重分级：能证明契约不变 → `[Spec: L0]`；行为改变或仍无法证明 → `[Spec: L2]`。重分级输出只含三项：`依据`（代码与契约的关系）、`spec`（current / stale / absent / unknown）、`下一步`。执行中复杂度超出初始判断 → 暂停、重新加载 change、升级后继续。

发现现行行为与归档 spec 的语义冲突时，除非满足纯笔误判据，否则为 `stale` 并升 L2；知识库日期只能作为调查信号，不能单独决定等级。

用户 `/skip-spec` → 强制 L0，记录跳过事实。

---

## spec-漂移

代码 ↔ spec 不一致分两个方向，处理完全不同：

| 方向                    | 本质      | 处理              |
| ----------------------- | --------- | ----------------- |
| 代码错，spec 对         | bugfix    | L0，改代码贴 spec |
| spec 旧，契约已被外部改 | spec 漂移 | 按下文分轨        |

**分轨**（按 spec 状态与归属）：

| 情形                                              | 处理                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| 未归档，且覆盖该文件的 active change 属于当前任务 | 在该 change 内更新 delta specs + tasks，代码随动，不新开 change       |
| 未归档，但覆盖 change 属他人/无关任务             | 不并入他人 change，按已归档轨新开「契约同步」change                   |
| 已归档（主 spec 过时）                            | L2 开「契约同步」change：更新 delta specs 与代码，archive 合并主 spec |
| 纯笔误                                            | L1 确认后降为 L0：直接补主 spec，提交信息记录修正原因                 |

**Completion criterion**：回复列出 change 内的 delta spec 与代码路径，且两者同轮出现在 `git status`。除已判定的纯笔误外，主 spec 只由官方 sync 或 archive 更新。

**笔误 vs 契约变更判据**：纯笔误必须满足：代码、测试、已发布接口与历史决策均未改变，且修正不改任何行为工件。存在外部变更来源、代码或测试行为差异、或无法确定 → 契约变更。

**契约同步 change 的精简提案**：只写外部变更来源、旧值 → 新值、影响面，跳过 design。sidecar 与 review 流程同普通 L2，不豁免。

**补票**：check 阶段才发现「代码对、spec 旧」时，代码已落地属既成事实——同轮补建契约同步 change（精简提案），把已落地 diff 纳入其验收，照常 review，回复中明示「补票」。补票是追认 + 完整审查，不是放行。

---

## l2-setup

无 active change 时，写 in_scope 代码之前：

1. `<openspec> list --json`，按 sidecar 的 `related_files` / `keywords` 查找关联 change。
2. 未找到 → 调用官方 propose（见 [openspec-bridge.md](openspec-bridge.md#propose-桥接)）。PRD 清晰可跳过 explore，但不跳过 propose；契约同步类 change 使用精简提案，见 [#spec-漂移](#spec-漂移)。
3. 在 `<state-file>` 写入 schedule state（`status: active`，填 `related_files`、`keywords`）。
4. 输出停点：change 名称、从 tasks / delta specs 逐项计数的必需验收数、`propose` 是确认门的原因，以及开始实施的唯一下一步。

只提取用户明确提到的内容，不添加推测。关键缺失信息放入 proposal「待确认」并询问用户。

**Completion criterion**：`<openspec> status --change <name> --json` 显示 `isPlanningComplete: true`，且 `applyRequires` 的 artifacts 均为 `done` 或 `skipped`；回复包含 change、验收数、停点原因和下一步，并等待用户继续。propose 回合不调用 apply。

---

## l2-start

有 active change 时：

1. 用 `<openspec> status --change <name> --json` 读取工件状态，并读 `<state-file>`。工件内容由官方 apply skill 加载。
2. 用 `<openspec> status --change <name> --json` 确认 `isPlanningComplete: true`，且 `applyRequires` 的 artifacts 均为 `done` 或 `skipped`；不满足则按 status 指示继续规划，本回合不调用 apply。
3. 需求变化时调用官方 update；通过 readiness 门槛后才调用官方 apply，并随进度更新 sidecar `updated`。

---

## check

in_scope 代码落地后：

1. `git status` 核验：契约同步场景下 change 内 delta spec 与代码须同轮变更；缺 delta → 回到 [#spec-漂移](#spec-漂移) 补票或补齐。除纯笔误外，主 spec 由 sync 或 archive 更新。
2. `<openspec> status --change <name> --json` 检查 engine 状态。
3. `<openspec> validate <name> --strict --json` 检查结构与 delta。
4. 调用当前工具的官方 verify skill（Cursor：`/opsx-verify`；不是 `<openspec>` CLI 子命令），再运行该 change 所需的测试、lint、build。
5. 对照 tasks 与 delta specs，输出验收简表：

```
| # | 验收标准 | 状态 | 说明 |
```

只有 validate 成功、verify 完成、每条必需验收为通过、且要求的测试/lint/build 退出码为 0，才执行 `review`。否则保持 active 并列出未满足项。纯文档/格式任务在 sidecar 记录 `review_skipped_reason`，不触发 review。

对照中发现「代码对、spec 旧」→ 不判不通过，按 [#spec-漂移](#spec-漂移) 分流：契约变更 → 补票；笔误 → 直接补主 spec。

---

## review

**官方 verify skill 后，必须派独立子代理审查**——实现 agent 不自审。verify 是 engine 的一致性检查；独立 review 审验收、质量与安全。

1. 计算 in_scope tracked 与 untracked 文件的路径、状态、精确字节 SHA-256 快照；快照等于 `review_snapshot` 时复用上次结果。
2. 快照变化时派独立子代理，输入为代码 diff、tasks、delta specs、status/validate/verify 与测试结果；任务含：
   - 需求一致性：逐条对照 tasks / delta specs 与代码 diff。
   - 代码质量：按 [#skill-discovery](#skill-discovery) 解析指令来源——环境命中的 review skill 优先，无命中用内置清单 [review/](review/)（四份全量加载：code-quality / security / solid / removal-plan）。**不允许跳过**。
3. 子代理只输出发现项，不实施修复；修复由实现 agent 执行。问题级别映射：`P0/P1 → 阻塞，P2 → 警告，P3 → 建议`。
4. 有阻塞项 → 修复后从 `check` 重跑，最多 3 轮；本轮问题数 ≥ 上一轮 → 不收敛，立即终止上报。
5. 通过 → sidecar 设 `status: dev-complete` 并写入 `review_snapshot`。

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

验收表由 `check` 产出；独立子代理复核验收并产出代码质量检查。实现 agent 只汇总。

---

## 状态机

状态存于 sidecar，**不是** OpenSpec 原生字段：

```
active → dev-complete → accepted → OpenSpec archive
active → cancelled
dev-complete → active（继续修改或 review 不通过）
```

- AI 可设：`active`、`dev-complete`
- AI **禁止**设：`accepted`、`cancelled`（仅人类）
- `dev-complete` 要求 tasks 勾选 ≥ 90%；`accepted` 要求 = 100%
- archive 前，sidecar 必须是 `accepted`；归档事实由 OpenSpec 状态和 change 位置决定
- archive 只走 OpenSpec；不得手工合并 delta 或移动 change
- archive 成功后删除 `<state-file>`；历史由 OpenSpec archive 保留

---

## recover

**优先级：先读 `<openspec> list --json` 与 project state；命中 change 后读 `<openspec> status --change <name> --json`，后参考聊天历史。**

```
if 用户指令文件 ∩ state.related_files 非空 → 相关，读 status 并确认是否继续
if 用户指令关键词 ∩ state.keywords 非空 → 相关，读 status 并确认是否继续
if 均不匹配 → 视为无关，不打扰
if 不确定 → 确认「这个改动是否属于 change <name>？」
```

确认续做后进入 `start`，由官方 apply skill 读取并实施工件。

衰减：同一 change 每会话最多提示 1 次；拒绝后本会话不再提示，并递增 state `rejection_count`；`rejection_count ≥ 3` 不再主动提示。

---

## skill-discovery

Review 子代理的指令来源，运行时扫描（不持久化）：

```
1. <workspace>/.cursor/skills/
2. <workspace>/.agents/skills/
3. ~/.cursor/skills-cursor/
4. ~/.agents/skills/
5. 内置兜底：<workspace>/.cursor/skills/auto-spec/references/review/
```

| 角色     | 匹配关键词                    | 无命中时                 |
| -------- | ----------------------------- | ------------------------ |
| 代码质量 | `code-review`, `reviewer`     | 内置清单（code-quality） |
| 安全     | `security`, `review-security` | 内置清单（security）     |
| Bug      | `bugbot`, `bug`               | 内置清单（code-quality） |

环境命中优先于内置清单——用户自己维护的 review skill 永远赢。内置清单是 floor（必查项下限），环境 skill 是 ceiling（深度上限）。skill 决定子代理**怎么审**，不决定**审不审**。

---

## 系统自动操作

以下不受 RIPER-5 EXECUTE「未经用户要求不修改文件」限制：

- L2 完成后自动 `review`
- 随开发进度更新 schedule state 的 `status` / `updated`
