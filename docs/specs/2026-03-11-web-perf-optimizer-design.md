# Web Performance Optimizer Skill — 设计文档

> **创建日期**：2026-03-11
> **状态**：待审核
> **Skill 名称**：web-perf-optimizer

---

## 一、概述

一个引导式的 Web 性能优化工作流 Skill，性能基线优先、定位瓶颈、渐进式轮次优化并生成完整的优化记录的系统性工作流。

支持两种使用模式：

- **基线检查**：快速了解当前页面/项目的性能状况，输出基线报告
- **优化专项**：多轮渐进式优化，每轮优先聚焦瓶颈，最大化优化收益，持续改善直到用户满意

Checklist 导向设计：reference 文件按优化类别组织（bundle / runtime / perception），AI 基于项目实际技术栈自适应具体框架和构建工具的优化细节。

---

## 二、核心原则

### 2.1 基线度量优先

一切优化必须有数据支撑。不建立基线就动手优化是盲目的。每轮优化后必须重新度量，用数据验证优化效果。

### 2.2 用户体验优先于指标

性能优化的最终目标是提升用户感知体验，而非单纯追求指标数字。LCP 从 1.9s 优化到 1.7s 对用户几乎无感知，但提升 FCP （如增加过渡等）可能让用户感觉"快了很多"。Skill 在推荐优化方案时，应同时考量技术指标改善和用户感知改善。

### 2.3 不引入功能回归

性能优化不能以牺牲功能正确性为代价。涉及共享代码、公共组件、全局配置的修改，必须进行影响分析并提供验证清单。高风险优化必须在用户明确确认后才执行。

### 2.4 同环境对比有效性

不同环境下的绝对指标不可直接对比，但同一环境下的前后对比是可信的。Dev server 的环境噪音是"常量"，在 diff 中自动抵消。Skill 要求同一 session 内所有测量在相同环境下进行，环境不一致时发出警告。

### 2.5 从失败中学习

并非所有优化尝试都会成功。无效的优化和被回滚的优化同样有价值——它们告诉我们"这条路走不通"。Skill 通过 PERF_ARCHIVE 机制记录所有失败的优化尝试，跨 session 传承，避免后续优化专项重复犯同样的错误。

---

## 三、数据采集策略

### 3.1 采集来源

Skill 采用**双源互补 + 可选增强**的数据采集架构：

| 数据源                     | 采集方式                                       | 定位                           | 侵入性                           |
| -------------------------- | ---------------------------------------------- | ------------------------------ | -------------------------------- |
| 构建产物分析               | `build/ build test` 后同环境比较分析 dist 目录 | 始终可用，每轮必做             | 无                               |
| Chrome DevTools trace JSON | 用户在浏览器录制并导出                         | 主要运行时数据源               | 无                               |
| 轻量运行时注入             | Skill 临时注入观测代码到入口文件               | 可选 fallback，无 trace 时使用 | 轻量，需用户授权，采集后自动清理 |

**优先级**：构建产物分析（必做）→ Chrome trace JSON（推荐）→ 轻量注入（fallback）。

### 3.2 Chrome DevTools Trace JSON 的数据覆盖

一份 Chrome Performance 录制 JSON 包含的信息极为丰富：

- **加载性能**：FCP、LCP、FMP、TTFB、DOMContentLoaded、Load 时间戳
- **交互性能**：Long Tasks（>50ms）及其调用栈，TBT 可从 Long Tasks 累加
- **视觉稳定性**：Layout Shift 事件及偏移量，CLS 可直接计算
- **资源加载**：每个资源的网络请求时序（DNS、TCP、TTFB、下载）和大小
- **JS 执行热点**：完整 CPU Profile，函数级 self time / total time
- **HTTP 协议版本**：从网络请求的 protocol 字段提取

因此，Chrome trace JSON 是运行时分析的主要且足够的数据来源。

### 3.3 环境与鉴权问题

**Skill 不负责解决页面鉴权/跨域问题。** 用户自行确保目标页面可正常访问和交互。

**推荐录制环境**：本地构建(测试环境/生产环境)（`vite build && vite preview` 或等效方式）。Dev server 同样可接受——基于 2.4 节同环境对比原则，只需保持同一 session 内环境一致。

**环境降噪策略**：当检测到录制环境为 Vite dev server 时，Skill 自动过滤已知的环境噪音（ESM 模块逐个加载、HMR 客户端心跳等），只提取环境无关的有效信号（组件渲染耗时、函数执行热点、Layout thrashing 等）。

### 3.4 环境因素检测

Skill 在工作流中需获取以下环境信息（框架和构建工具在 Phase 1 自动识别，HTTP 版本和录制环境在 Phase 2 从 trace 中提取，无 trace 时在 Phase 3 询问用户）：

- **HTTP 协议版本** —— 影响拆包策略。HTTP/2 多路复用下可激进拆分（更多小 chunk），HTTP/1.1 需控制请求数（更少大 chunk）
- **框架类型** —— 自动识别（Vue/React 等），记录到 meta.json，供后续阶段 AI 自适应优化策略时参考
- **构建工具** —— 自动识别（Vite/Webpack 等），记录到 meta.json，供后续阶段 AI 自适应构建分析和优化配置时参考
- **录制环境** —— 从 trace URL 判断（localhost:5173 → Vite dev，localhost:4173 → Vite preview 等），标注数据置信度

---

## 四、三层指标体系

指标分为三层，每层解决不同的问题。优化的思考链路是：第一层不达标 → 第二层找原因 → 第三层定位代码 → 执行修改 → 重新度量第一层。

### 4.1 第一层：北极星指标（Core Web Vitals）—— 方向在哪

| 指标                            | 衡量什么   | 达标阈值 | 数据来源     | 录制场景     |
| ------------------------------- | ---------- | -------- | ------------ | ------------ |
| LCP (Largest Contentful Paint)  | 加载速度   | < 2.5s   | 冷启动 trace | 冷启动       |
| INP (Interaction to Next Paint) | 交互响应   | < 200ms  | 交互 trace   | 交互（可选） |
| CLS (Cumulative Layout Shift)   | 视觉稳定性 | < 0.1    | 冷启动 trace | 冷启动       |

### 4.2 第二层：诊断指标 —— 为什么差

| 指标             | 解释什么                         | 数据来源         |
| ---------------- | -------------------------------- | ---------------- |
| TTFB             | LCP 差是因为服务端慢还是前端慢？ | 冷启动 trace     |
| FCP              | 首次渲染被什么阻塞了？           | 冷启动 trace     |
| TBT / Long Tasks | 主线程被谁阻塞了？影响 INP       | 冷启动 trace     |
| JS bundle size   | 加载慢是因为包太大？             | 构建产物分析     |
| CSS size         | 样式资源是否过重？               | 构建产物分析     |
| 总传输体积       | 整体资源是否过重？               | trace / 构建产物 |
| Chunk 分布       | 代码分割是否合理？               | 构建产物分析     |
| 关键路径资源数   | 加载慢是因为请求太多太串行？     | 冷启动 trace     |
| 初始加载请求数   | HTTP/1.1 下请求排队是否严重？    | 构建产物 + trace |

### 4.3 第三层：定位指标 —— 改哪里

| 指标                        | 定位什么                   | 数据来源                    |
| --------------------------- | -------------------------- | --------------------------- |
| Top N 耗时函数（self time） | 具体哪个函数阻塞了主线程   | trace CPU Profile           |
| Top N 最大资源              | 具体哪个文件撑大了 bundle  | 构建产物 + trace            |
| 组件渲染耗时                | 哪个组件挂载/渲染最慢      | trace CPU Profile           |
| Layout thrashing 频率       | 哪段代码触发了强制重排     | trace 渲染事件              |
| 未懒加载的路由/组件         | 哪些代码不应该在首屏加载   | 代码静态分析                |
| 大依赖全量引入              | 哪个库应该按需引入         | 构建产物 + 代码静态分析     |
| 阻塞渲染的资源              | 哪些 CSS/JS 阻塞了首次渲染 | 冷启动 trace                |
| 代码级性能模式              | 哪些实现模式导致运行时低效 | 目标页面代码深读            |

### 4.4 录制场景说明

**冷启动录制**和**交互录制**是两个不同的录制场景，不应合并：

- **冷启动录制**（推荐必做）：打开 DevTools → 开始录制 → 刷新页面 → 等页面加载完成 → 停止录制。捕获从空白到页面可用的全过程。覆盖 LCP、FCP、TTFB、CLS、Long Tasks、资源加载等。
- **交互录制**（可选）：在已加载完的页面上开始录制 → 进行交互操作（点击按钮、路由跳转、打开弹窗等）→ 停止录制。主要捕获 INP 指标。交互性能问题也可通过代码静态分析辅助发现（如事件处理函数中的大量同步计算、动态 import 未做 loading 处理等）。

### 4.5 采样稳定性

Chrome trace JSON 由用户手动录制，通常单次即可，但 Skill 应提示用户在页面稳定后再开始录制。

---

## 五、工作流阶段详细设计

### Phase 0：会话初始化

**目标**：确认本次优化的范围和模式，创建 session 数据目录。

**具体操作**：

1. **确认使用模式**：基线检查 / 优化专项
2. **确认目标页面**：用户指定 1 个或多个页面路径（如 `/dashboard`、`/user-list`）
3. **检查历史记录与未完成 session**：读取 `.perf-docs/index.json`（如存在）：
   - 若目标页面有历史优化记录，展示上次优化摘要（日期、最终指标），询问用户是否参考
   - 若存在无 `final.json` 且非基线检查模式的 session（可能有多个），以列表形式展示所有未完成 session（session 名称 + 目标页面 + 最后活动阶段），用户逐一选择"继续"或"归档"。选择归档则标记为 incomplete。选择继续时（同时只能继续一个 session），Skill 根据 session 目录中的已有文件判断恢复点：(a) 有 `baseline.json` 且有 `round-{n}/metrics.json` → 从最后一个已完成轮次之后继续 Phase 4；(b) 有 `baseline.json` 且有 `round-{n}/changes.md` 但无对应 `metrics.json` → 该轮执行未完成，提示用户重新度量该轮；(c) 有 `baseline.json` 但无任何 round 目录 → 从 Phase 3 诊断开始；(d) 无 `baseline.json` → 从 Phase 2 基线建立开始。如果用户已表达"停止优化"但 Phase 5 未执行，恢复后直接执行 Phase 5
4. **检测交互语言**：根据用户消息自动识别交互语言（如中文、英文），记录到 `meta.json`。后续所有面向人类阅读的输出（诊断报告、轮次对比、最终报告等）均跟随此语言
5. **创建 session 目录**：`{YYYY-MM-DD}_{auto-description}`，description 由 Skill 根据模式和目标页面自动生成（如 `optimize-dashboard`、`baseline-check-user-list`），用户可修改。**同名冲突处理**：如果生成的目录名在 `.perf-docs/sessions/` 下已存在，自动追加序号（如 `_2`、`_3`），无需用户干预
6. **初始化 `meta.json`**：写入使用模式、目标页面列表、创建时间、交互语言

**产出**：session 目录和 `meta.json` 已就绪。

### Phase 1：项目分析

**目标**：理解项目的技术栈、构建配置和现有优化状况。

**具体操作**：

1. 读取 `package.json`（或等效依赖清单）/用户提供的项目快照数据(诸如.ai-docs/)，识别框架和关键依赖
2. 读取构建配置（`vite.config.*` / `webpack.config.*` 等），了解已有的优化配置（代码分割、压缩、Tree-shaking 配置等）

注意：HTTP 协议版本不在此阶段检测。该信息将在 Phase 2 步骤 2 从 trace JSON 中自动提取，如用户未提供 trace，则在 Phase 3 诊断前询问用户。

**产出**：项目环境报告，追加写入 session 的 `meta.json`。

**详细指引**：`references/phase-1-project-analysis.md`

### Phase 2：基线建立

**目标**：采集当前性能数据，建立量化基线。

基线建立分为三个步骤，前两步可并行，第三步可选：

#### 步骤 1：构建产物分析 + 代码静态分析（全自动，Skill 独立完成）

- **构建产物分析**：
  - 执行生产构建
  - 分析 dist 目录：chunk 数量、大小、依赖关系
  - 识别体积异常的 chunk 和依赖
  - 详见 `references/build-analysis.md`

- **代码静态分析（广度扫描）**：
  - 扫描路由配置，识别未懒加载的路由
  - 扫描 import 语句，识别大依赖全量引入
  - 检查图片资源是否使用懒加载

- **目标页面代码深读**：
  - 根据 Phase 0 确认的目标页面路径，定位对应的入口组件（如 `/home` → `home.vue`）
  - 阅读入口组件源码及其直接引用的子组件（一层深度），理解实际实现模式
  - 关注的代码模式：组件加载方式（同步/异步）、数据获取模式（是否存在瀑布请求）、列表渲染方式（大列表是否使用虚拟滚动）、计算密集逻辑（复杂 computed / 大数组 filter）、事件处理（同步重计算）等
  - 范围控制：仅读取目标页面涉及的组件，不读取其他页面（如优化 `/home` 时不读取 `/info` 页面的代码）。嵌套子组件不递归深入，除非后续 trace 数据指出其中有性能热点
  - **与 Phase 4 的关系**：代码深读在 Phase 2 执行一次，为 Phase 3 首次诊断提供定性输入。Phase 4 每轮执行代码修改时，AI 天然需要重新阅读相关代码以理解上下文和影响范围——这等同于隐式的代码重读。因此不需要在每轮显式重跑 Phase 2 的代码深读步骤，但如果某轮修改引入了新的代码模式问题（如重构后产生新的瀑布请求），AI 应在该轮的轮次对比报告中标注发现

此步骤完全自动化，无需用户参与。

#### 步骤 2：冷启动 trace 解析（用户提供录制文件，推荐）

用户在浏览器中录制页面加载过程并导出 JSON，提供给 Skill。

**Trace 摘要提取机制**：Chrome trace JSON 文件通常 5-50MB，不适合直接作为上下文。Skill 必须对原始 trace 进行解析，按三层指标体系提取结构化摘要，丢弃原始数据。提取流程：

1. 解析 trace JSON，遍历 trace events
2. 提取环境信息（录制 URL → 判断 dev/preview/production、HTTP 协议版本）
3. 提取第一层指标：LCP、CLS 时间戳和数值
4. 提取第二层指标：TTFB、FCP、TBT（从 Long Tasks 累加）、资源请求列表
5. 提取第三层指标：Top N 耗时函数（从 CPU Profile）、Layout 事件频率、阻塞资源列表
6. Dev 环境下执行智能降噪（过滤 ESM 模块加载、HMR 等噪音）
7. 输出结构化摘要（见下方示例），写入 `baseline.json`

**摘要输出示例**：

```
=== 冷启动基线摘要 ===
环境：Vite dev server (localhost:5173)
HTTP 版本：HTTP/2

北极星指标：
  LCP:   3,800ms  ⚠️ 超过 2.5s 阈值
  CLS:   0.05     ✓ 达标
  (INP:  未录制交互，跳过)

诊断指标：
  TTFB:  120ms
  FCP:   1,200ms
  TBT:   680ms    ⚠️ 超过 200ms 阈值
  Long Tasks: 8 个（最长 320ms）

定位指标：
  Top 3 耗时函数：
    1. evaluateScript (vendor.js) — 280ms
    2. renderComponent (UserList) — 150ms
    3. JSON.parse (apiResponse) — 95ms
  Top 3 最大资源：
    1. vendor.js — 1.2MB
    2. hero-banner.png — 520KB
    3. main.js — 380KB
  阻塞资源: 3 个 CSS, 2 个同步 JS
  总请求: 47 个, 总体积: 2.8MB

代码级性能模式（目标页面代码深读）：
  - UserList 组件：同步加载，大列表（500+ 项）未使用虚拟滚动
  - 数据获取：onMounted 中存在瀑布请求（先 fetchUsers 再 fetchRoles）
  - 事件处理：handleSearch 内同步执行大数组 filter + sort
```

详见 `references/flamegraph-analysis.md`

#### 步骤 3：交互 trace 解析（可选）

如用户明确存在交互卡顿问题，可在页面加载完成后单独录制交互操作的 trace，提供给 Skill 提取 INP 指标。交互性能问题也可通过步骤 1 的代码静态分析辅助发现。

#### 步骤 fallback：轻量运行时注入（无 trace 且用户授权时）

当用户无法提供 trace JSON 时的备选方案：

- 告知用户将临时修改入口文件
- 注入 PerformanceObserver 观测脚本
- 用户操作页面后采集数据
- 采集完成后自动清理注入代码
- 详见 `references/runtime-profiling.md`

#### 数据写入

所有步骤采集的数据统一写入 session 的 `{page-name}/baseline.json`，使用结构化摘要格式，而非原始 trace 数据。

**baseline.json 与 metrics.json 的 schema 关系**：`baseline.json` 包含全量数据（构建分析 + 代码静态分析 + 目标页面代码深读 + trace 摘要）。Phase 4 轮次的 `metrics.json` 仅包含可量化的对比字段（构建分析 + trace 摘要），不重复代码深读——因为代码深读是定性分析，用于 Phase 3 诊断"为什么慢"，而每轮的代码变更已记录在 `changes.md` 中。两者在构建分析和 trace 摘要部分的 schema 一致，以支持轮次间定量对比。

#### index.json 注册

Phase 2 完成后，将本 session 与目标页面的关联写入 `index.json`：为每个目标页面的 `sessions` 数组追加当前 session 名称。此时不更新 `latest_baseline`（等 session 结束时再更新，确保指向最终有效数据）。

**详细指引**：`references/phase-2-baseline.md`

### Phase 3：问题诊断 & 优先级推荐

**目标**：分析基线数据，输出排序后的优化建议清单。

**强制前置操作**：读取 `.perf-docs/PERF_ARCHIVE.md`（如存在），了解历史失败优化，在推荐中排除或降权已知无效的方案。

**具体操作**：

1. 汇总所有数据源的发现
2. 对每个发现的问题评估：
   - **预估收益**：优化后预计改善的幅度
   - **确定性**：改善幅度的可信程度（高 / 中 / 低）
   - **风险等级**：Low（无风险或低风险，可直接执行）/ Medium（需验证，可能影响其他模块）/ High（高风险，涉及核心逻辑或全局配置）
   - **优化类别**：bundle（参照 `references/bundle-checklist.md`）/ runtime（参照 `references/runtime-checklist.md`）/ perception（参照 `references/perception-checklist.md`）
   - **可批量（batchable）**：Low 风险 + 与其他候选项无代码依赖关系 = true；Medium/High 风险或存在依赖 = false。此标记供 Phase 4 轮次分组使用
3. 按 **"预估收益 × 确定性"** 降序排列
   - **可量化收益**：用预估数字表达（如"预计减少 bundle 500KB"、"可消除 280ms Long Task"）
   - **不可量化收益**：用定性标签（高 / 中 / 低），主要用于感知优化（如"添加骨架屏，感知提升：高"）
   - 不强求所有优化项都有精确数字，但可量化的必须给出预估值

**Tier-2 覆盖规则（MUST）**：每个超过阈值的 tier-2 诊断指标**必须**在优先级清单中映射至少一条优化建议。不允许出现"某个诊断维度亮红灯但没有对应优化项"的情况。具体要求：

- TBT > 200ms → 必须有至少一条针对 Long Task 消减的建议（从 tier-3 的 Top N 耗时函数定位具体优化目标）
- JS bundle size 超标 → 必须有 bundle 体积优化建议
- CSS size 超标 → 必须有 CSS 优化建议
- 初始加载 JS 请求数超标（HTTP/1.1 > 15 或 HTTP/2 > 60）→ 必须有 chunk 合并或请求减少的建议（如 manualChunks 配置合并小 chunk、内联关键 CSS/JS）
- 关键路径资源过多 → 必须有资源加载优化建议
- 其他超阈值的 tier-2 指标同理（各 tier-2 指标的具体阈值定义见 `references/phase-3-diagnosis.md`，因阈值可能随项目类型和用户设定的性能预算调整，不在 spec 层面硬编码）

此规则确保诊断发现的所有问题维度都有可执行的优化路径，防止 AI 只关注易量化的维度（如 bundle size）而忽视需要深入分析的维度（如运行时 Long Tasks）。

**PERF_ARCHIVE 冲突兜底**：当某个超阈值 tier-2 指标的所有已知优化方案均已记录在 PERF_ARCHIVE 中（即历史上已尝试且失败），Skill 仍需在清单中列出该指标，但标注为"已知方案已耗尽"，并向用户说明：(a) 哪些方案曾尝试过及失败原因，(b) 是否存在尚未尝试的替代路径（如换一种拆分策略、引入新技术方案），(c) 如确无可行方案，标记为"当前不可优化"并在报告中如实记录。此兜底规则优先级高于覆盖规则——不强求为已知无解的指标生造优化建议。

4. 如尚未获取 HTTP 协议版本信息（用户未提供 trace），在此阶段主动询问用户
5. **HTTP 版本策略调整（MUST）**：获取 HTTP 版本后，记录到 `meta.json` 的 `httpVersion` 字段，并主动修改候选项评分（不仅是标注）：
   - **HTTP/1.1 环境下**：所有会增加初始加载请求数的优化项（任何 sync→async 转换），确定性自动降低一档（High → Medium, Medium → Low），并标注"⚠️ HTTP/1.1：需配合 chunk 合并策略"。步骤 6 将对特定场景（如 entry route）进一步评估净收益，可能直接移除
   - **HTTP/1.1 + 初始加载 JS chunk 数 > 15**：自动生成一条"chunk 合并（manualChunks 配置）"高优先级候选项
   - **HTTP/2+ 环境下**：激进代码分割不受限制，按 `references/bundle-checklist.md` 粒度建议（20-100KB gzip/chunk）执行
   - **HTTP 版本未知时**：必须先向用户确认后再继续排序
   - 详细的降权算法和候选项列举见 `references/phase-3-diagnosis.md` Step 8
6. **约束一致性检查（MUST）**：此步骤是步骤 5 通用降权的进一步细化——步骤 5 降低确定性，本步骤评估净收益，对净收益为负的项直接移除。排序完成后，对候选清单进行环境约束交叉验证，不允许方向矛盾的候选项共存：
   - 对每个候选项评估其对关键约束维度的净影响（如请求数 +1 或 -3），检测同一维度上的矛盾
   - **Entry route 规则**：访问概率 100% 的入口路由（如 `/`、`/index`），懒加载净收益为负（HTTP/1.1）或接近零（HTTP/2），应移除或降为最低优先级
   - 净收益为负的候选项移除并标注原因
   - 详细的评估方法和矛盾检测算法见 `references/phase-3-diagnosis.md` Step 9
7. 感知优化（骨架屏、乐观更新等）与技术优化并列呈现
8. 询问用户是否设定性能预算（如 LCP < 2.5s、主 bundle < 500KB）。如不设定，使用 Core Web Vitals 默认阈值（LCP < 2.5s、INP < 200ms、CLS < 0.1）。预算存储在 session 的 `meta.json` 中，后续轮次对比时用于判定达标情况

**呈现格式**：向用户展示排序后的优化清单，每项包含问题描述、预估收益（数字或定性标签）、确定性、风险等级。用户可调整优先级或排除某些项。

**空清单处理**：若所有 tier-2 指标均在阈值内且代码静态分析未发现问题，优化清单为空。此时向用户说明"当前各项指标均达标，无待优化项"，跳过 Phase 4，直接进入 Phase 5 生成报告（报告内容为基线数据 + "所有指标达标，无需优化"的结论）。

**降级诊断模式**：当 Phase 2 仅有构建产物分析 + 代码静态分析数据（无 trace、无注入）时，Phase 3 进入受限诊断模式：

- 明确告知用户：北极星指标（LCP / INP / CLS）无法评估，诊断范围仅覆盖构建维度和代码层面
- 可诊断的问题：bundle 体积过大、chunk 分割不合理、未懒加载的路由/组件、大依赖全量引入、静态资源未优化、代码级性能模式（目标页面代码深读不依赖 trace，始终可用）
- 性能预算仅针对可获取的指标设定（如 bundle size < 500KB），不设定 CWV 相关预算
- 在报告中标注"建议提供 Chrome trace 以获取完整性能画像"
- Phase 4 同样可正常运行——构建维度的优化（拆包、Tree-shaking、懒加载等）不需要运行时数据，每轮重新构建后对比 dist 产物变化即可
- **中途补充 trace**：如用户在 Phase 4 某轮中提供了 trace，Skill 将 trace 摘要写入该轮 `metrics.json`，并在轮次报告中标注"本轮起新增运行时数据"。下一轮开始前，基于补充数据重新运行诊断逻辑更新优先级清单，后续轮次可评估完整 CWV 指标

**基线检查模式的收尾操作**：如果当前为基线检查模式，Phase 3 完成后即为 session 终点。额外执行：

1. 将诊断输出持久化为 `report.md`（基线摘要 + 排序后的优化建议清单 + 性能预算达标情况），不使用 Phase 5 的完整报告模板
2. 更新 `index.json`：将每个目标页面的 `latest_baseline` 指向本 session 的 `baseline.json`

**详细指引**：`references/phase-3-diagnosis.md`

### Phase 4：优化轮次（循环）

**目标**：逐轮执行优化，每轮后度量效果，用户决定继续或停止。

**风险分级批量规则**：为减少度量循环次数、最大化每轮优化效率，Phase 4 采用基于风险的分组策略而非固定 1-2 项/轮：

- **可批量项**（Phase 3 标记 `batchable: true`）：Skill 从优先级清单顶部向下扫描，将连续的可批量项合并为一个批量轮次，**单批上限 5 项**。批量内各项必须互相独立（不修改同一文件、不存在执行顺序依赖）
- **须单独项**（`batchable: false`）：单独成轮，保持精确归因能力
- **扫描遇到须单独项时**：关闭当前批量（如有），将该项单独成轮，然后继续扫描后续可批量项
- **用户覆盖**：用户在确认步骤中可自由拆分批量或合并 Skill 分开的项

**优化多样性规则（MUST）**：当优先级清单包含多个优化类别（bundle、runtime、perception 等）的项目时，Skill 不得连续超过 2 轮聚焦同一类别。连续 2 轮属于同一类别后，下一轮**必须**优先推荐其他类别的最高优先级项（除非该类别已无剩余项）。**批量轮次计数**：一个批量轮次按 1 轮计算；若批量内包含多个类别（如 2 个 bundle + 1 个 perception），视为"混合"轮次，不计入任何单一类别的连续计数。Session 起始时无历史轮次，连续计数从 0 开始（即前两轮可自由选择类别）。此规则防止 AI 只做简单的 bundle 优化而回避需要深入分析的运行时问题。

**Phase 5 硬门控（MUST）**：当用户决定停止优化（或所有优先级项完成），Skill **必须立即执行 Phase 5 的全部步骤**后才能结束 session。Phase 5 不可跳过、不可推迟、不可省略。未创建 `final.json` 和报告文件的 session 是不完整的。此指令的优先级高于对话结束——即使用户没有明确要求生成报告，Skill 也必须主动执行。

**每轮流程**：

1. **推荐**：Skill 按风险分级批量规则从优先级清单顶部向下扫描，将可批量项合并推荐（上限 5 项/批）或将须单独项单独推荐（遵循多样性规则）
2. **确认**：用户确认或调整本轮目标
3. **执行**：Skill 执行代码修改
   - 涉及共享代码时，先进行影响分析，列出可能受影响的模块
   - 高风险修改需用户明确确认
4. **重新度量**（与 Phase 2 采集流程对齐）：
   1. 用户重新执行生产构建
   2. Skill 重新分析 dist 产物（必做，因为代码已修改）
   3. 用户重新录制冷启动 trace 并提供给 Skill（仅当 Phase 2 使用了 trace 时）
   4. Skill 解析新 trace 并提取摘要
   5. 合并构建分析 + trace 摘要，写入 `round-{n}/metrics.json`（构建分析和 trace 摘要部分的 schema 与 `baseline.json` 一致，不含代码深读）
5. **轮次对比报告**：
   - 本轮变更摘要（改了什么文件、什么代码）
   - 变化指标高亮（含改善/恶化百分比）
   - 恶化指标红色警告
   - 累计改善（当前 vs 最初基线）
   - 性能预算达标情况（如已设定）
6. **回归检查**：全量指标对比（降级模式下指"当前可获取的全部指标"），确保没有恶化其他维度。**HTTP/1.1 环境下额外检查**：如果本轮优化导致初始加载 JS chunk 数增加，即使其他指标改善，也必须标记为潜在回归并警告用户请求排队风险，建议配合 chunk 合并。**批量轮次回归处理**：如果批量轮次出现回归，Skill 根据回归类型（如 CLS 恶化、TBT 增加）和各项代码 diff 分析定位最可能的嫌疑项，然后整轮回滚；下一轮中将非嫌疑项重新批量执行（跳过嫌疑项），嫌疑项记入 PERF_ARCHIVE；如无法定位嫌疑项，整轮回滚后将该批次拆分为单独轮次逐项重新验证。**跨页面优化回滚**：涉及跨页面优化的批量回滚后，需重新度量所有受影响页面以确认回滚效果
7. **失败处理**：如优化无效或被回滚，写入 `PERF_ARCHIVE.md`，并在该轮 `round-{n}/changes.md` 中标记 `status: rolled-back`（供 Phase 5 识别回滚轮次，确定 final.json 来源）。**批量轮次回滚时**：整批视为一个轮次进行回滚，不支持部分回滚（部分回滚等于创建新轮次，应走正常流程）
8. **用户决策**：继续下一轮 / 停止优化 → 进入 Phase 5

**详细指引**：`references/phase-4-optimization-loop.md`

### Phase 5：收尾 & 报告生成

**目标**：固化最终数据，生成完整的优化记录。

**前置操作：创建 final.json & 更新 index.json**：

1. 确定 final.json 来源：`final.json` 的语义是"当前代码状态对应的最后一次有效度量"——始终指向最近一个未回滚轮次的 `metrics.json`，无有效轮次时回退到 `baseline.json`。具体场景判定详见 `references/phase-5-report.md` Step 1
2. 将 final.json 写入每个目标页面目录
3. 更新 `index.json`：将每个目标页面的 `latest_baseline` 指向本 session 的 `final.json`

**报告语言**：所有面向人类阅读的产出物（报告、日志）的语言跟随 `meta.json` 中记录的交互语言。结构化数据文件（`baseline.json`、`metrics.json`、`index.json` 等）的 key 始终使用英文。

**两份产出物**：

#### 技术日志（Technical Log）

面向开发者自己回顾，包含：

- Session 元信息（日期、目标页面、环境配置）
- 基线数据快照
- 每轮详情：变更内容、代码 diff 摘要、指标变化、是否有回归
- 失败/回滚的优化记录及原因
- 最终数据快照

模板：`references/report-templates/technical-log.tpl.md`

#### 汇总报告（Summary Report）

面向团队/leader 汇报，包含：

- 优化前后核心指标对比（一目了然的数据）
- 关键优化措施总览
- 主要成果（如"LCP 从 4.2s 降至 1.8s，bundle 从 1.8MB 降至 620KB"）
- 后续建议

模板：`references/report-templates/summary-report.tpl.md`

**详细指引**：`references/phase-5-report.md`

---

## 六、数据组织结构

### 6.1 目录结构

```
.perf-docs/
├── sessions/
│   └── {YYYY-MM-DD}_{description}/
│       ├── meta.json                  # session 元数据
│       ├── {page-name}/
│       │   ├── trace-summary.json     # parse-trace.js 输出（中间产物）
│       │   ├── baseline.json          # 基线数据
│       │   ├── round-{n}/
│       │   │   ├── changes.md         # 本轮代码变更摘要
│       │   │   ├── trace-summary.json # 本轮重新度量 trace（如适用）
│       │   │   └── metrics.json       # 本轮采集指标
│       │   └── final.json             # 最终指标（仅优化专项模式）
│       ├── report.md                  # 基线检查模式：诊断报告
│       ├── technical-log.md           # 优化专项模式：开发者详细技术日志
│       └── summary-report.md          # 优化专项模式：团队/管理层总结报告
├── PERF_ARCHIVE.md                    # 失败知识库（跨 session 持久化）
└── index.json                         # 全局页面索引
```

### 6.2 index.json 结构

```json
{
  "pages": {
    "/dashboard": {
      "sessions": [
        "2026-03-11_optimize-dashboard",
        "2026-03-13_optimize-dashboard-and-userlist"
      ],
      "latest_baseline": "sessions/2026-03-13_.../dashboard/final.json"
    },
    "/user-list": {
      "sessions": ["2026-03-13_optimize-dashboard-and-userlist"],
      "latest_baseline": "sessions/2026-03-13_.../user-list/final.json"
    }
  }
}
```

**设计要点**：

- **Session 自包含**：每次优化会话完整独立，可单独回顾
- **页面历史可追溯**：通过 index.json 知道每个页面的优化历史
- **基线历史可参考**：新 session 开始时，从 index 获取页面历史指标作为参考展示，但始终重新采集新鲜基线（详见 9.4）
- **`final.json` 定义**：语义为"当前代码状态对应的最后一次有效度量"。详细来源规则见 Phase 5 前置操作。基线检查模式下不产生 `final.json`，`baseline.json` 即为最终数据
- **非正常退出处理**：用户关闭 IDE 等非正常退出不会触发 Phase 5，`final.json` 不会被创建。Phase 0 启动时会检测此类 incomplete session 并提示用户处理

**Git 处理策略**：

- `PERF_ARCHIVE.md` 和 `index.json` **建议提交**到 git——它们是跨 session 的共享知识，团队成员都应看到
- `sessions/` 目录下的具体数据**由用户决定**是否提交。数据量较大的项目可在 `.gitignore` 中排除 `.perf-docs/sessions/`，仅保留上述两个文件

### 6.3 PERF_ARCHIVE.md 结构

采用扁平结构 + Type 字段区分失败类型，条目按时间倒序排列，不按类型分区。Phase 3 读取时通过 Type 字段过滤。

```markdown
# Performance Archive

## [2026-03-12] /order-detail — 拆分 vendor chunk

- **Session:** 2026-03-12_optimize-order-detail
- **Round:** 2
- **Type:** regression-rollback
- **What was tried:** 将 vendor chunk 拆分为 5 个独立 chunk
- **Expected benefit:** -200KB largest chunk
- **Actual result:** HTTP/1.1 环境下加载反而变慢（+0.8s）
- **Why it failed:** HTTP/1.1 并发连接数限制，过多请求排队
- **Lesson:** 仅在 HTTP/2 环境下推荐激进拆包策略

## [2026-03-11] /dashboard — 图片转 WebP

- **Session:** 2026-03-11_optimize-dashboard
- **Round:** 3
- **Type:** ineffective
- **What was tried:** 将首屏 Banner 图从 PNG 转为 WebP
- **Expected benefit:** -200KB image size, LCP improvement
- **Actual result:** LCP 无明显改善（-0.05s）
- **Why it failed:** 瓶颈不在图片解码，而是 JS 阻塞
- **Lesson:** 对该页面图片优化优先级极低，应聚焦 JS 瓶颈
```

Type 取值：

- `ineffective`：优化无可测量效果
- `regression-rollback`：优化导致其他指标回归

---

## 七、Skill 文件结构

```
web-perf-optimizer/
├── SKILL.md                               # 主工作流（<500行）
├── scripts/
│   └── parse-trace.js                     # Chrome trace JSON 解析脚本
└── references/
    ├── phase-1-project-analysis.md        # 项目分析详细指引
    ├── phase-2-baseline.md                # 基线建立流程
    ├── phase-3-diagnosis.md               # 诊断与优先级算法
    ├── phase-4-optimization-loop.md       # 优化轮次执行协议
    ├── phase-5-report.md                  # 报告生成规范
    ├── flamegraph-analysis.md             # Chrome trace JSON 解析规则与降噪逻辑
    ├── build-analysis.md                  # 通用构建产物分析方法论
    ├── runtime-profiling.md               # 轻量注入采集方案
    ├── bundle-checklist.md                # Bundle 优化策略 checklist
    ├── runtime-checklist.md               # 运行时性能优化 checklist
    ├── perception-checklist.md            # 感知性能优化 checklist（骨架屏、乐观更新等）
    └── report-templates/
        ├── technical-log.tpl.md           # 技术日志模板
        └── summary-report.tpl.md          # 汇总报告模板
```

**目录职责**：

- **SKILL.md**（始终加载）：定义完整工作流阶段和入口判断逻辑
- **scripts/**：可执行脚本，处理 AI agent 无法直接完成的确定性任务（如解析大体积 trace 文件）。Agent 按 SKILL.md 指引调用，脚本无需加载到上下文即可执行
- **references/**（按需加载）：进入对应阶段时读取。其中 `flamegraph-analysis.md` 定义提取规则（从哪些事件类型提取什么指标、降噪逻辑、输出格式），`parse-trace.js` 是该规则的脚本实现
- **Checklist 文件**（按需加载）：进入 Phase 3/4 时根据当前优化类别读取对应 checklist（bundle / runtime / perception）。Checklist 按优化类别组织而非按框架组织，AI 基于 meta.json 中记录的技术栈信息自适应具体框架和构建工具的优化细节
- **Report templates**（Phase 5 加载）：生成报告时使用

---

## 八、关键设计决策

| 决策项                   | 结论                                                 | 理由                       |
| ------------------------ | ---------------------------------------------------- | -------------------------- |
| 指标体系                 | 三层结构：北极星 → 诊断 → 定位                       | 链路清晰（详见第四节）     |
| 运行时数据主要来源       | Chrome DevTools trace JSON                           | 信息密度最高，无侵入       |
| Trace 大文件处理         | 解析提取结构化摘要，丢弃原始数据                     | 原始文件过大（5-50MB）     |
| 冷启动 vs 交互录制       | 冷启动推荐必做，交互录制可选                         | 首屏加载是主要瓶颈         |
| 基线建立步骤             | 自动分析先行 → 冷启动 trace → 交互 trace 可选        | 自动部分零成本             |
| 无 trace 时的 fallback   | 轻量注入观测代码                                     | 降低使用门槛               |
| 环境鉴权问题             | 不由 Skill 解决                                      | Skill 聚焦性能分析         |
| Dev server 数据有效性    | 同环境对比有效                                       | 噪音在 diff 中抵消         |
| HTTP 版本处理            | 从 trace 提取或询问用户，Phase 3 主动调整评分        | 需主动调整评分和生成候选项 |
| 优先级排序算法           | 预估收益 × 确定性                                    | 最大化前几轮收益           |
| 轮次批量策略             | Low 风险 + 独立项可批量（上限 5），其余单独成轮      | 减少度量次数，保留归因能力 |
| 约束一致性检查           | Phase 3 排序后交叉验证矛盾候选项                     | 防止矛盾优化抵消收益       |
| 失败知识传承             | PERF_ARCHIVE.md                                      | 跨 session 持久化          |
| 优化深度控制             | 用户决定                                             | 推荐但不强制               |
| 目标页面代码深读         | Phase 2 读取目标页面入口组件 + 直接子组件，定性分析代码级性能模式 | 补充 trace 无法覆盖的"为什么慢"，范围控制避免上下文膨胀 |
| 技术栈适配               | Checklist 按优化类别组织，AI 自适应框架/构建工具     | 与 code-reviewer 一致的模式，降低维护成本 |
| 感知优化                 | 与技术优化并列                                       | 用户体验优先原则           |
| 数据组织                 | Session 为主 + 页面索引为辅                          | 兼顾完整性和可追溯         |
| 每轮指标对比展示         | 变化高亮 + 累计对比 + 回归警告                       | 用户决策的核心依据         |
| 性能预算                 | Phase 3 询问用户设定，不设定则用 CWV 默认阈值        | 需"达标/未达标"判定标准    |
| 预估收益表达             | 可量化用数字，不可量化用定性标签                     | 感知优化不应被排除         |
| 基线检查模式的数据持久化 | 同样创建 session 目录写入数据                        | 避免重复采集               |
| 会话初始化               | Phase 0 独立阶段，Phase 1 前执行                     | 所有后续步骤的前提         |
| index.json 更新时机      | Phase 2 注册关联，session 结束时更新 latest_baseline | 先注册再指向最终数据       |
| final.json 创建时机      | Phase 5 前置操作                                     | 最后一轮确定后才能创建     |
| final.json 边界场景      | 始终指向"当前代码状态对应的最后一次有效度量"         | 详见 Phase 5 / reference   |
| 无运行时数据时的诊断     | 受限诊断模式，仅覆盖构建维度                         | 降级而非阻断               |
| 续接历史优化的基线策略   | 正常重新采集，历史数据仅作参考                       | 历史数据可能已过时         |
| 多页面轮次组织           | 页面级 + 跨页面优化分别处理                          | 跨页面优化累加收益         |
| 非正常退出               | Phase 0 检测 incomplete session 并提示               | 避免孤立 session           |
| 报告语言                 | 跟随用户交互语言，Phase 0 自动检测                   | 产出物使用用户熟悉的语言   |
| Tier-2 覆盖规则          | 每个超阈值 tier-2 指标必须映射至少一条优化建议       | 确保所有维度有可执行路径   |
| 优化多样性规则           | 连续 2 轮同类别后必须切换到其他类别                  | 防止回避深入分析的维度     |
| Phase 5 硬门控           | 用户停止优化后必须立即执行 Phase 5 全部步骤          | 确保每次优化有完整闭环     |

---

## 九、使用模式说明

### 9.1 基线检查模式

适用场景：开发完新功能后快速评估性能状况。

流程：Phase 0 → Phase 1 → Phase 2 → Phase 3（输出诊断报告 + 更新 index.json，不进入优化轮次）。收尾操作详见 Phase 3"基线检查模式的收尾操作"。不产生 `final.json`。

数据会持久化到 session 目录，下次发起优化专项时可直接引用，无需重新采集。

### 9.2 优化专项模式

适用场景：专门安排性能优化专项，系统性改善。

流程：Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4（多轮循环）→ Phase 5（创建 final.json + 更新 index.json + 生成报告）

### 9.3 多页面场景

一次 session 可包含多个目标页面（在 Phase 0 确认）。每个页面独立建立基线、独立跟踪轮次。Session 级别的 report 汇总所有页面的优化成果。

**轮次组织规则**：

- **页面级优化**（如某个组件懒加载）：归入对应页面的轮次序列
- **跨页面优化**（如 vendor chunk 拆分、全局 CSS 提取）：在 Phase 3 诊断时标记为"跨页面"类型，执行后所有受影响的页面都需要重新度量
- 优先级排序时，跨页面优化可累加所有受影响页面的收益，因此通常排名较高
- 每轮对比报告中，跨页面优化需分别展示各页面的指标变化

### 9.4 续接历史优化

当对某个页面发起新的优化 session 时：

1. Phase 0 从 `index.json` 获取该页面上一次的 `latest_baseline` 数据，**作为历史参考展示给用户**（"上次优化后该页面的指标为..."）
2. Phase 2 **正常执行**，采集当前代码状态的新鲜基线
3. 新旧基线对比展示：若指标明显变化（新功能导致的性能退化或其他团队成员的优化成果），提示用户注意
4. 同时读取 PERF_ARCHIVE 避免重复之前的失败尝试

这确保基线始终反映当前代码的真实状态，而非过时的历史数据。

---

## 十、局限性

1. **Chrome trace JSON 需要手动录制**：每轮优化后需要用户手动在 DevTools 录制并导出，无法完全自动化。
2. **Dev 环境下绝对值不可信**：同环境对比有效，但如需判断是否达到生产环境的性能预算，需要在生产构建环境下验证。
3. **代码静态分析存在盲区**：动态 import、运行时决定的加载路径等无法通过静态分析捕获。
4. **感知优化难以量化**：骨架屏、乐观更新等感知优化的效果无法用指标精确衡量，依赖用户的主观判断。
