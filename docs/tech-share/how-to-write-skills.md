# Skill 的设计到实现

## 一、为什么需要 Skill

通用 AI 模型拥有通用广博的知识，但在特定领域的深度和一致性上存在天然缺口。

当 AI 面对专业任务时，它会：

1. **重复探索**：缺乏直接可用的最佳实践，同类任务每次都需重新评估方案
2. **输出不一致**：缺乏确定性约束，相同输入可能产生不同格式的输出
3. **私有知识缺失**：对公司内部 schema、业务规则、团队规范等上下文一无所知

**Skill 的本质**：不是"教 AI 新知识"，而是将领域专业知识编码为可复用的**程序性知识**（procedural knowledge），类似"chrome 插件"，装上 AI 就多了一个能力（专业领域知识）。

### 1.1 Skill 是什么

Skill 是一个提供了指令、参考资料、工具脚本的文件夹，可以拓展 AI 程序知识的能力。

> **例：PDF 处理 Skill**
>
> 假设你经常让 AI 帮你处理 PDF 文件（提取文本、合并页面、旋转方向）。每次都要解释需求、等待 AI 写代码、调试错误——既慢又不稳定。
>
> 创建一个 `pdf-processor` Skill：
> ```
> pdf-processor/
> ├── SKILL.md           # 包含处理 PDF 的标准流程和工具推荐
> ├── scripts/
> │   ├── extract_text.py    # 提取文本（封装好的脚本）
> │   ├── merge_pdfs.py      # 合并文件
> │   └── rotate_pdf.py      # 旋转页面
> └── references/
>     └── pdfplumber.md      # API 文档，供 AI 按需查阅
> ```
> 之后你只要说"帮我把这份 PDF 旋转 90 度"，AI 立即调用 Skill 中的脚本，1 秒完成——无需重写代码，结果稳定可靠。

**Skill 还能做什么**

1. **专业工作流** —— 多步骤领域任务的标准流程
2. **工具集成** —— 特定文件格式或 API 的操作指导
3. **领域知识** —— 公司内部 schema、业务逻辑、私有规范
4. **资源复用** —— 脚本、参考资料、模板文件的打包使用

### 1.2 Skill 的最小结构与完整形态

**最小形态**只需要一个文件：

```bash
skill-name/
└── SKILL.md                  # [必需] 指令入口文件（ frontmatter + body 组成）
```
一个 SKILL.md 文件由 **Frontmatter**（前置元数据）和 **Body**（正文）两部分组成，分别承担不同的职责：

| 部分 | 加载时机 | 核心作用 |
|------|----------|----------|
| **Frontmatter**（YAML 区块） | 始终 | **决策用**：AI 靠它判断何时激活该 Skill |
| **Body**（Markdown 正文） | 激活后加载 | **执行用**：AI 调用 Skill 后按此执行 |

```yaml
---
name: pdf-processor               # ← metadata 元数据（）
description: >-                   #    AI 根据描述匹配激活
  PDF 文档处理与转换。用于：(1) 提取文本/图片/表格，
  (2) 合并/拆分/旋转页面。当用户需要处理 PDF 文件时触发。
---                                  ← YAML frontmatter 结束标记

# 正文：操作指令                    # ← AI 激活 Skill 后才会读到这里
## 提取文本
使用 pdfplumber 库...

## 合并 PDF
使用 PyPDF2...
```

**完整结构**包含四种`捆绑资源`：

```bash
skill-name/
├── SKILL.md                  # [必需] 入口：frontmatter + body
├── agents/                   # [推荐] UI 元数据
│   └── openai.yaml
├── scripts/                  # [可选] 可执行脚本
├── references/               # [可选] 参考文档
└── assets/                   # [可选] 产出物模板
```

各资源说明：

| 组件 | 在 AI 调用过程中的作用 |
|------|------------------------|
| **SKILL.md** | **决策入口**：frontmatter 帮助 AI 判断是否应调用此 Skill；body 提供调用后的执行指导 |
| **scripts/** | **确定性执行**：封装易错或重复的操作，AI 可直接调用脚本获得可靠结果 |
| **references/** | **知识补给**：当 AI 需要特定领域知识（如 schema、API 文档）时按需查阅 |
| **assets/** | **产出资源**：AI 在生成最终输出时直接使用的模板文件，不进入推理上下文 |
| **agents** | **UI 展示 / 独立子代理**：既用于用户技能列表的显示信息，也可定义专用子代理（如特殊模型配置、独立系统提示词），与主 Skill 逻辑解耦 |

### 1.3 设计 Skill 的核心挑战

了解了 Skill 的基本结构后，你可能会想：既然 Skill 能捆绑这么多资源（scripts、references、assets），那是不是可以把所有相关知识都塞进去？

**答案是否定的。**

如果每次调用都加载全部内容，上下文会被迅速撑爆。

**上下文窗口构成：**

```bash
[系统提示] + [对话历史] + [所有 Skill 的 metadata] + [用户请求] + [实际工作内容]
```

上下文窗口（context window）是有限的公共资源。如果每个 Skill 都塞入几百行说明，AI 能用于处理任务的剩余空间就会被严重挤压。

> **原文注解**：The context window is a public good. Skills share the context window with everything else Codex needs: system prompt, conversation history, other Skills' metadata, and the actual user request.

**因此 Skill 的设计必须考虑上下文窗口的物理限制，在限制下给 AI 传达有效指令**。

- 上下文效率：如何在有限窗口内传递最大化信息
- 触发精准性：何时加载 Skill，何时不加载
- 执行可靠性：如何让 AI 在 fragile 任务中稳定遵循

接下来我们看 Open AI 的 [skill-creator](https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md) （创建 skill 的 skill ）如何从设计上解决的。

> Anthropic 的 [skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md) 周下载量(116.7K)更高，追加了AB测、评估体系，更具创建 skill 的工程化雏形，文末会提供框架图。
> OpenAI 的简明扼要，聚焦快速落地一个 skill。

## 二、简洁原则

### 2.1 简洁至上

面对这一约束，skill-creator 提出的原则是**简洁至上**（Concise is Key）。

**默认假设：AI 已经足够聪明**，只补充它确实没有的知识。

写作时不断自我反问：
- "AI 真的需要这个解释吗？"
- "这段文字值得消耗这些 token 吗？"

### 2.2 只保留 AI 必需的文件

OpenAI skill-creator 明确禁止这些文件：

| 禁止文件 | 为什么不该放 |
|----------|--------------|
| README.md | 这是给人看的，AI 不需要 |
| INSTALLATION_GUIDE.md | 安装说明与任务执行无关 |
| QUICK_REFERENCE.md | 快速参考可以集成到 SKILL.md |
| CHANGELOG.md | 版本历史不是执行指令 |

> **原文注解**：The skill should only contain the information needed for an AI agent to do the job at hand. It should not contain auxiliary context about the process that went into creating it, setup and testing procedures, user-facing documentation, etc.

原因很简单：Skill 是面向 AI 读取的，任何辅助文档都是噪音——不是因为它"错了"，而是因为它"无关"。

### 2.3 祈使句表达

用最少词汇传达指令

**简洁的首要技法**：直接下达指令，省略一切冗余词汇。

```markdown
❌ 叙述式（带冗余解释）
We typically use pdfplumber for PDF text extraction because it handles layout well.

✅ 祈使式（直接指令）
Use pdfplumber to extract text from PDF pages.
```

**句式精简对照**：

| 冗长表达 | 精简改写 | 节省 |
|----------|----------|------|
| "It is recommended to use..." | "Use..." | ~4 tokens |
| "You should ensure that..." | "Ensure..." | ~3 tokens |
| "In order to achieve..." | "To achieve..." | ~2 tokens |
| "Please note that the..." | （直接陈述） | ~3 tokens |

> **最佳实践**：采用简洁示例说明代替冗长解释，代码示例胜过文字描述。

但这只是**第一步**。光写得少还不够——如果不划定边界，AI 会在无限大的可行域里随机游走。

### 2.4 反模式与边界划定

**可行域的核心问题：**

| 约束方式 | 效果 | 结果 |
|----------|------|------|
| 描述"做什么" | 定义无限大的可行域 | AI 随机游走，结果不可预测 |
| 声明"不做什么" | 在可行域上画边界 | AI 行为空间被收窄到期望范围 |

**示例：**

```markdown
❌ 只说"做什么"（无边界）
Use React to build the UI.
→ AI 可能选择 class components、HOC、render props 等任意模式

✅ 明确"不做什么"（有边界）
Use React function components. Class components are excluded from this codebase.
→ AI 明确知道边界在哪里
```

**四种常见的边界反模式**：

| 反模式 | 问题 | 正确做法 |
|--------|------|----------|
| **过度刚性**（MUST/ALWAYS/NEVER） | 压缩 AI 推理空间，过度约束 | 用祈使句表达关键约束 |
| **过度详细**（10+ 步骤清单） | 限制灵活度，僵化流程 | 提取核心约束，让 AI 自主完成 |
| **过度特化**（具体到变量名） | 难以复用，适配性差 | 展示输入/输出抽象模式 |
| **边界缺失**（完全无约束） | AI 随机游走，行为不可预测 | 明确「不做什么」划定边界 |

**正反对比：**

```markdown
❌ 过度刚性（反模式）
MUST use React functional components.
MUST never use class components.
ALWAYS use TypeScript.
NEVER use any.

✅ 边界清晰（正确）
Use React function components. Class components are excluded from this codebase.
Use TypeScript. Prefer interface over type alias.
```

边界指令的作用是**收窄可行域**，而非消除推理能力。但即便划定了边界，如果只是一条条堆砌禁令，仍然会陷入"写不完"的困境。

### 2.5 引导 AI 举一反三

**写得少 ≠ 简洁**。

既然 LLM 具备心智理论，Skill 写作应通过**解释原因** 引导 AI，而非罗列刚性禁令。AI 理解「为什么」后，能自主泛化到类似场景，在边界内寻找最优解。

> **原文注解**：Today's LLMs are *smart*. They have good theory of mind and when given a good harness can go beyond rote instructions and really make things happen.

**对比两种写法**：

```markdown
❌ 生硬禁令（只有边界，无解释）
Never create README.md
Never create CHANGELOG.md
Never create CONTRIBUTING.md
Never create LICENSE.txt
（如果有 100 种文档格式，要写 100 条禁令吗？）

✅ 解释 reasoning（边界 + 原因）
Avoid auxiliary documentation files. Skill is an execution manual for AI agents,
not a software package for human users. README.md, CHANGELOG.md, etc. are
irrelevant to task execution and consume context window.
```

解释原因后，AI 会自己推导出：
- CONTRIBUTING.md 同样不该存在（属于辅助文档）
- LICENSE.txt 同样不该存在（与执行无关）
- 任何新的文档类型都可以用同样的逻辑判断*

---

**输入/输出的模式化表达**：

用抽象模式说明预期格式，不绑定具体案例：

```markdown
❌ 过度特化（写死了具体路径）
Input: "docs/report.pdf" → Output: "output/report.txt"

✅ 通用模式（抽象化表达）
Input: PDF file path
Output: Extracted plain text
Example: 3-page PDF → "Page 1...\nPage 2...\nPage 3..."

```

简洁是应对有限上下文的手段，但有效的信息传递才是目的——这就引出了"渐进式披露"的架构设计。

## 三、 渐进式披露

既然上下文有限，不能一次性加载所有信息，那么Skill 必须要在恰当的时机被调用，那么它的设计必须解决两个核心问题:

1. 何时触发？ —— 模型需要在海量可用工具中识别出当前场景适合调用此 skill
2. 如何执行？ —— 调用后模型需要获取足够的指导来完成任务

这就引出了"**渐进式披露**"（Progressive Disclosure）架构——一个三级信息加载系统：

> **原文注解**：Skills use a three-level loading system to manage context efficiently: 1. **Metadata (name + description)** - Always in context (~100 words), 2. **SKILL.md body** - When skill triggers (<5k words), 3. **Bundled resources** - As needed by Codex (Unlimited because scripts can be executed without reading into context window)

| 层级 | 内容                                  | 加载时机     | 量级                       |
| :--- | :------------------------------------ | :----------- | :------------------------- |
| L1   | Frontmatter（name + description）     | 始终     | ~100 词                    |
| L2   | SKILL.md 正文                         | Skill 触发后 | <5000 词（<500 行）        |
| L3   | 捆绑资源（scripts/references/assets） | 按需加载     | 无上限（脚本可不读即执行） |


- **L1 作为 filter 判断是否加载** => 依靠 description 不准导致误触发/不触发
- **L2 作为指令触发后指导 AI 操作** => 内容太长，AI注意力会稀释 因此要控制在 500行内
- **L3 作为辅助工具，按需使用** => 其中 **scripts/ 只执行不读**，零 token 成本

### 3.1 Frontmatter：触发机制的唯一来源

Frontmatter 只有两个必需字段，但它决定了 Skill 是否会被调用：

```yaml
---
name: pdf-processor
description: |
  PDF 文档处理与转换。用于：(1) 提取文本/图片/表格，
  (2) 合并/拆分/旋转页面，(3) 添加水印或数字签名。
  当用户需要处理 PDF 文件时触发。
---
```

关键原则：**所有"何时使用"的信息必须写在 Frontmatter 的 description 中**，不要放在正文里——因为正文加载时 Skill 已经触发了。

### 3.2 四种资源的本质区别

| 资源类型 | 本质区别 | 典型使用场景 |
|----------|----------|--------------|
| **Scripts** | 可执行代码，追求确定性结果 | PDF 旋转、图片压缩、数据格式转换 |
| **References** | 可读文档，追求知识准确性 | API 文档、数据库 schema、公司政策 |
| **Assets** | 可直接使用的模板文件 | PPT 模板、前端脚手架、品牌素材 |
| **Agents 元数据/子代理** | UI 展示用/独立子代理，不影响执行 | Skill 列表显示、独立子代理 |

**禁止冗余**：信息应该要么在 SKILL.md，要么在 references，不要两边重复。

> **原文注解**：Avoid duplication: Information should live in either SKILL.md or references files, not both. Prefer references files for detailed information unless it's truly core to the skill.

### 3.3 渐进式披露的三种组织模式

核心原则：SKILL.md 正文控制在 500 行以内，接近时拆分内容到其他文件。拆分时务必在 SKILL.md 中引用并说明何时读取，确保读者知道它们的存在和使用场景。

关键原则：当 Skill 支持多种变体、框架或选项时，SKILL.md 只保留核心工作流和选择指导，变体专属细节（模式、示例、配置）移到独立参考文件。

**模式一：带引用参考的高级指南（High-level guide with references）**

SKILL.md 包含快速入门，高级功能链接到 references：

```markdown
# PDF Processing

## Quick start

Extract text with pdfplumber:
[code example]

## Advanced features

- **Form filling**: See [FORMS.md](FORMS.md) for complete guide
- **API reference**: See [REFERENCE.md](REFERENCE.md) for all methods
- **Examples**: See [EXAMPLES.md](EXAMPLES.md) for common patterns
```

AI 仅在需要时才加载 FORMS.md、REFERENCE.md 或 EXAMPLES.md。

**模式二：领域/变体组织（Domain-specific organization）**

多领域 Skill 按领域组织内容，避免加载无关上下文：

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md (revenue, billing metrics)
    ├── sales.md (opportunities, pipeline)
    ├── product.md (API usage, features)
    └── marketing.md (campaigns, attribution)
```

用户询问销售指标时，Codex 只读取 sales.md。

同理，支持多框架/变体的 Skill 可按变体组织：

> 多变体: 同样的流程应用于不同平台/场景

```
cloud-deploy/
├── SKILL.md (workflow + provider selection)
└── references/
    ├── aws.md (AWS deployment patterns)
    ├── gcp.md (GCP deployment patterns)
    └── azure.md (Azure deployment patterns)
```

用户选择 AWS 时，Codex 只读取 aws.md。

**模式三：条件性细节披露（Conditional details）**

基础内容直接展示，高级内容条件链接：

```markdown
# DOCX 文档处理

## 编辑文档

简单编辑直接修改 XML。

**需要修订模式（追踪修改）**：见 [修订模式.md](references/修订模式.md)
**需要 OOXML 底层细节**：见 [OOXML.md](references/OOXML.md)
```

只有用户需要追踪修改或了解 OOXML 底层细节时，Codex 才读取对应的参考文件。

**避坑指南**：

- **避免深层嵌套**：所有 references 必须直接从 SKILL.md 链接

> **原文注解**：Avoid deeply nested references - Keep references one level deep from SKILL.md. All reference files should link directly from SKILL.md.

- **长文件加目录**：references 超过 100 行需添加目录，方便 Codex 预览时了解全貌
- **500 行红线**：SKILL.md 正文控制在 500 行以内

## 四、 内容自由度分配构建

渐进式披露解决了"何时加载"问题，但还有一个问题——如何确保 AI 执行任务稳定遵循？

任务的脆弱性决定了约束的强度。就像道路设计：

> 设计隐喻
>
> 想象 Codex 在探索路径：
>
> - 悬崖边的窄桥需要护栏（低自由度）
> - 开阔的田野允许多种路线（高自由度）

### 4.1 三个自由度档位

> **原文注解**：
>
> - **High freedom (text-based instructions)**: Use when multiple approaches are valid, decisions depend on context, or heuristics guide the approach.
> - **Medium freedom (pseudocode or scripts with parameters)**: Use when a preferred pattern exists, some variation is acceptable, or configuration affects behavior.
> - **Low freedom (specific scripts, few parameters)**: Use when operations are fragile and error-prone, consistency is critical, or a specific sequence must be followed.

| 档位 | 约束形式 | 适用场景 | 典型示例 |
|------|----------|----------|----------|
| **高自由度** | 文本指令，描述目标和原则 | 多路径皆有效，依赖上下文判断 | "使用简洁的变量名，遵循 PEP8" |
| **中自由度** | 伪代码或参数化脚本 | 存在推荐模式，允许一定变体 | `scripts/generate_api.py --endpoint=user --method=POST` |
| **低自由度** | 具体脚本，极少参数 | 操作易碎，一致性关键，必须严格顺序执行 | `scripts/rotate_pdf.py --input=file.pdf --angle=90` |

总结： 任务确定性越高（不允许自由发挥）=> 脚本写死

### 4.2 自由度分配的判断标准

 Skill-creator 的自由度分配

| 步骤 | 自由度 | 原因 |
|------|--------|------|
| **Step 1: 用户交互、理解技能** | 高 | 需要探索场景、灵活提问、判断边界 |
| **Step 2: 规划资源** | 中 | 模板 + 分析具体例子，识别可复用内容，需创造性判断 |
| **Step 3: 初始化目录结构** | **低** | 运行 `init_skill.py` 脚本，确定性操作 |
| **Step 4: 编辑 Skill 内容** | 中 | 有资源优先顺序指导，但具体实现需灵活调整 |
| **Step 5: 校验** | **低** | 运行 `quick_validate.py` 脚本，确定性操作 |
| **Step 6: 迭代** | 中 | 有迭代四步流程，但判断改进点需分析能力 |

**核心逻辑**：

- **高自由度步骤**（理解、规划）：探索性强，多种方法都有效，依赖上下文判断
- **中自由度步骤**（编辑、迭代）：有推荐模式但可调整，需要配置和决策
- **低自由度步骤**（初始化、校验）：操作易错且需一致性，使用脚本确保可靠

问自己三个问题：

1. **这个任务有多少种正确的做法？**
   - 多种都 OK → 高自由度
   - 有推荐做法但可调整 → 中自由度
   - 只有一种正确做法 → 低自由度

2. **出错的代价是什么？**
   - 错了可以重来 → 高自由度
   - 错了需要返工 → 中自由度
   - 错了会造成数据丢失/安全漏洞 → 低自由度

3. **这个操作是否被反复重写？**
   - 每次都在写类似的 PDF 旋转代码 → 封装成脚本
   - 每次都在查同一个 API 文档 → 放入 references
   - 每次都在创建相同的项目结构 → 放入 assets

### 4.3 质量保障链

skill-creator 通过两个脚本在流程两端建立质量保障：

```
┌─────────────────────────────────────────────────────────────┐
│  Step 3: 初始化 (init_skill.py)                              │
│  ├── 命名规范化为 hyphen-case                                │
│  ├── 创建标准目录结构                                         │
│  ├── 生成 SKILL.md 模板（含结构指导）                         │
│  └── 创建 agents/openai.yaml UI 元数据                       │
│                         ↓                                    │
│  Step 4: AI 编辑实现（高自由度人工干预）                        │
│  ├── 实现 scripts/references/assets                          │
│  ├── 填充 SKILL.md 内容（遵循模板指导）                        │
│  └── 删除占位文件，保留必需资源                                │
│                         ↓                                    │
│  Step 5: 校验 (quick_validate.py)                            │
│  ├── 校验 YAML frontmatter 格式                              │
│  ├── 校验必需字段（name、description）                        │
│  ├── 校验命名规范（hyphen-case、≤64字符）                     │
│  └── 校验字段约束（description 无<>、≤1024字符）              │
└─────────────────────────────────────────────────────────────┘
```

**`init_skill.py` — 初始化脚本**

功能：创建标准化的 Skill 目录结构

| 参数 | 说明 | 示例 |
|------|------|------|
| `skill-name`（必需）| Skill 名称，自动规范化为 hyphen-case | `pdf-processor` |
| `--path`（必需）| 输出目录路径 | `--path skills/public` |
| `--resources` | 创建资源目录，逗号分隔 | `--resources scripts,references` |
| `--examples` | 在资源目录中创建示例文件 | `--examples` |
| `--interface` | UI 元数据覆盖，可重复 | `--interface short_description="PDF 工具"` |

创建内容：
- 带 TODO 的SKILL.md 模板（含 结构指导）
- `agents/openai.yaml`（UI 元数据）
- 可选资源目录（scripts/、references/、assets/）

**`quick_validate.py` — 校验脚本**

功能：验证 Skill 格式合规性

| 参数 | 说明 | 示例 |
|------|------|------|
| `skill_directory`（必需）| Skill 文件夹路径 | `skills/public/pdf-processor` |

校验项：
- YAML frontmatter 格式有效性
- 必需字段存在（name、description）
- 命名规范（hyphen-case，≤64 字符）
- 字段约束（description 无尖括号，≤1024 字符）
- 允许的 frontmatter 键（name, description, license, allowed-tools, metadata）

### 4.4 什么时候需要脚本？

**什么该封装成脚本？**

| 特征               | 典型场景             | 案例                               |
| ------------------ | -------------------- | ---------------------------------- |
| 操作易错，后果严重 | 格式校验、命名规范化 | `quick_validate.py` 校验 YAML 格式 |
| 需要 100% 确定性   | 数据转换、文件处理   | `rotate_pdf.py` 旋转 PDF           |
| 被反复重写         | 工具函数、样板代码   | 提取表格、合并文档                 |
| 有精确约束         | 长度限制、正则匹配   | 校验 description ≤1024 字符        |

**什么用文字指令？**

| 特征               | 典型场景           | 案例                                      |
| ------------------ | ------------------ | ----------------------------------------- |
| 需要理解上下文意图 | 触发判断、场景识别 | description 该包含哪些触发条件            |
| 多种路径皆有效     | 架构选择、风格决策 | SKILL.md 用「工作流式」还是「任务式」结构 |
| 依赖具体情境       | 灵活调整、例外处理 | 何时用 scripts，何时用 references         |
| 需要创造性         | 设计决策、内容创作 | 为特定领域编写领域知识文档                |

**一句话判断**：如果写完后你可以放心地交给脚本自动执行，不需要再看上下文——就封装成脚本；如果每次执行都需要根据情况调整——就用文字指令。

## 五、 创建流程

既然明白了简洁原则、渐进式披露、内容自由度分配构建，那么创建流程自然要体现这些原则。

| 步骤                                | 目的                           | 对应的原则                                       |
| :---------------------------------- | :----------------------------- | :----------------------------------------------- |
| Step 1: 理解技能 用具体例子建立共识 | 明确功能边界和使用场景         | 确保 Frontmatter 描述准确                        |
| Step 2: 规划可复用内容              | 识别 scripts/references/assets | 自由度分析、提前设计 L3 资源，保持 SKILL.md 简洁 |
| Step 3: 初始化 Skill                | 生成标准结构                   | 确保渐进式披露的基础设施就绪                     |
| Step 4: 编辑 Skill                  | 先实现资源，再写 SKILL.md      | 遵循"从可复用内容开始"原则                       |
| Step 5: 校验 Skill                  | 验证 YAML 格式和必需字段       | 保障触发机制有效                                 |
| Step 6: 迭代                        | 基于真实使用优化               | 持续验证自由度分配是否恰当                       |

### 5.1 命名规范（前置准备）

在创建之前，确保名称符合规范：

- **格式**：小写字母、数字、连字符，不超过 64 字符
- **风格**：动词开头，描述动作（如 `pdf-processor` 而非 `pdf`）
- **命名空间**：按工具命名（如 `gh-address-comments`、`linear-create-issue`）
- **文件夹名**：与 skill name 完全一致

### 5.2 Step 1：理解技能——用具体例子建立共识

**目标**：建立对功能边界和使用场景的清晰认知。

**关键问题**（分批提问，不要一次问完）：
- "这个 Skill 应该支持哪些功能？"
- "能给几个具体的使用例子吗？"
- "用户会说什么话来触发这个 Skill？"

**完成标准**：能清晰回答"用户请求什么时应该触发这个 Skill"。

### 5.3 Step 2：规划可复用内容

对每个具体例子，问自己：
1. 如果从头执行，需要什么步骤？
2. 哪些步骤会被反复执行？
3. 哪些可以封装为脚本、参考资料或资产？

**典型案例**：
- PDF 旋转 → `scripts/rotate_pdf.py`（重复编码）
- 前端项目 → `assets/hello-world/`（重复样板）
- BigQuery 查询 → `references/schema.md`（重复查 schema）

### 5.4 Step 3：初始化 Skill

**必须运行初始化脚本**（除非 Skill 已存在）：

```bash
# 基础初始化
scripts/init_skill.py my-skill --path skills/

# 带资源目录
scripts/init_skill.py my-skill --path skills/ --resources scripts,references

# 带示例文件
scripts/init_skill.py my-skill --path skills/ --resources scripts --examples
```

脚本会自动生成：
- 标准目录结构
- SKILL.md 模板（含 TODO）
- agents/openai.yaml（UI 元数据）
- 可选资源目录

### 5.5 Step 4：编辑 Skill

**编辑顺序**：先实现可复用资源，再写 SKILL.md。

**资源实现**：
- Scripts：编写并测试运行
- References：整理领域知识
- Assets：准备模板文件

**SKILL.md 编写**：
- **Frontmatter**：name + 详尽的 description（触发条件写清楚）
- **Body**：使用祈使语气（Always use imperative/infinitive form）
- **长度**：控制在 500 行以内

**清理**：删除 `--examples` 生成的占位文件，只保留必需资源。

### 5.6 Step 5：校验 Skill

运行验证脚本：

```bash
scripts/quick_validate.py path/to/skill-folder
```

检查项：
- YAML frontmatter 格式
- 必需字段（name, description）
- 命名规范

### 5.7 Step 6：迭代

**迭代触发**：真实使用后立即优化，此时反馈最鲜活。

**迭代四步**：
1. 在真实任务中使用 Skill
2. 观察困难或低效之处
3. 识别 SKILL.md 或资源需要调整的地方
4. 实施改进并再次测试

## 六、总结

回到最初的问题：怎么写出好的 skill？

基于 skill-creator 的设计哲学，好 Skill = **简洁约束下的信息最大化** + **渐进式披露的分层加载** + **自由度匹配的落地步骤**。

### 6.1 简洁：信息密度最大化

默认假设 AI 已经足够聪明，只补充它确实没有的知识。挑战每个段落：
- "AI 真的需要这个解释吗？"
- "这段文字值得消耗这些 token 吗？"

**祈使句优于叙述句**：用"Use pdfplumber to extract text"代替"We typically use pdfplumber because it handles layout well"。

**解释原因优于罗列禁令**：不说"Never create README.md, CHANGELOG.md, CONTRIBUTING.md..."，而说"Skill 是 AI 执行手册而非软件包，辅助文档与任务无关且消耗上下文"。AI 理解 reasoning 后能自主推导新场景。

### 6.2 渐进式披露：三层加载系统

```
L1 Frontmatter (name + description)     始终加载    ~100 词
    ↓ 触发判断
L2 SKILL.md 正文                      触发后加载  <5000 词
    ↓ 按需引用
L3 捆绑资源 (scripts/references/assets) 按需加载   无上限
```

**关键原则**：
- L1 负责"何时触发"——所有触发条件必须在 description 中
- L2 负责"如何执行"——只保留核心工作流，细节链到 L3
- L3 负责"特定场景"——变体分离、条件加载

**三种组织模式**：
1. **高级指南模式**：SKILL.md 给 Quick Start，Advanced 链到 references
2. **领域/变体模式**：多场景/多框架时拆分 references，按场景加载
3. **条件披露模式**：默认路径直接展示，特殊场景条件链接

### 6.3 自由度匹配：约束强度 = 任务脆弱性

| 自由度 | 约束形式 | 适用场景 | 案例 |
|--------|----------|----------|------|
| 高 | 文字指令，描述目标 | 多种做法皆有效，需情境判断 | 理解技能场景、规划资源 |
| 中 | 伪代码或参数化脚本 | 有推荐模式但可调整 | 编辑 SKILL.md 内容 |
| 低 | 具体脚本，极少参数 | 操作易错，一致性关键 | init_skill.py、quick_validate.py |

**判断标准**：
- 任务有多少种正确做法？多种→高，一种→低
- 出错代价是什么？可重来→高，数据丢失→低
- 是否被反复重写？是→封装成脚本

**Skill = 领域知识编码 + 渐进式披露架构 + 恰当自由度约束**

用尽可能少的 token，通过策略约束 AI，让 AI 在边界内自由发挥。

 ## 附录

### 附录A. Skill Spec 大纲

以下大纲帮助你在实现前明确 Skill 的核心要素。采用**引导式提问**而非命令式清单，遵循本文的核心原则：祈使句表达、反模式边界、解释优于强指令（强指令占比 ≤20%）。

````
#### 一、基本信息 (Frontmatter)

**名称 (name)**
- 使用小写字母、数字、连字符，长度 ≤64 字符
- 动词开头，描述动作而非对象
- 示例：`pdf-processor`（非 `pdf`）、`gh-create-issue`（非 `github-tool`）

```yaml
name: ______
```

**描述 (description)**

这是决定 Skill 何时被触发的**唯一依据**。AI 始终加载此字段，触发后才读取正文。

回答以下问题来撰写描述：
1. **功能边界**：这个 Skill 支持哪些具体功能？（列举 2-3 个核心场景）
2. **触发词汇**：用户会用什么词汇来描述这些需求？（记录典型表达）
3. **边界说明**：哪些相似但不支持的功能需要明确排除？

```yaml
description: |
  [核心功能 1-2 句话]。用于：(1) [场景 1]，(2) [场景 2]，(3) [场景 3]。
  当用户 [描述触发条件] 时触发。
```

> **反模式警告**：不要在 description 中使用尖括号 `<>`，字符数 ≤1024。

---

#### 二、功能边界与触发场景

用具体例子建立共识，避免抽象描述。

**具体例子收集**（至少 3 个）

对每个例子，填写：
- **用户请求**：_"帮我..."_
- **预期输出**：_"生成/提取/转换..."_
- **不支持场景**：_"不包括..."_

| 例子 | 用户请求 | 预期输出 | 不支持场景 |
| ---- | -------- | -------- | ---------- |
| 1    |          |          |            |
| 2    |          |          |            |
| 3    |          |          |            |

**边界反模式识别**

标记以下场景：
- [ ] 功能过于宽泛（如"处理所有文档格式"）
- [ ] 用户请求模糊（如"优化代码"）
- [ ] 输出不确定（如"自动选择最佳方案"）

如果勾选任意项，重新定义功能边界或在 description 中明确排除。

---

#### 三、核心工作流 (SKILL.md Body)

**工作流类型选择**

选择最契合任务特性的组织方式：
- [ ] **线性流程**（步骤 1 → 2 → 3）：适用于有明确顺序的操作
- [ ] **任务分类**（按功能分组）：适用于多个独立功能的工具集
- [ ] **决策树**（条件分支）：适用于需要根据输入选择不同路径的场景

**工作流草稿**

使用祈使句描述步骤，每个步骤 ≤2 行：

```markdown
## [功能/阶段 1]
[动词开头的指令 1]
[动词开头的指令 2]

## [功能/阶段 2]
[动词开头的指令 1]
```

> **简洁检查**：如果 SKILL.md 正文超过 500 行，考虑拆分内容到 references/。

---

#### 四、可复用资源规划

对每个具体例子，问自己：
1. 哪些操作会被反复执行且易错？ → 候选 **scripts/**
2. 哪些知识需要查阅但不常变化？ → 候选 **references/**
3. 哪些模板可以直接复用？ → 候选 **assets/**

**Scripts 规划**

| 脚本名 | 功能 | 输入参数 | 输出 | 确定性 (1-10) |
| ------ | ---- | -------- | ---- | ------------- |
|        |      |          |      |               |

> **脚本判断标准**：确定性 ≥8 时封装成脚本（即操作 100% 可复现）。

**References 规划**

| 文件名 | 内容类型             | 何时加载         | 长度预估 |
| ------ | -------------------- | ---------------- | -------- |
|        | API 文档/Schema/规范 | 当用户 [条件] 时 |          |

> **拆分时机**：单个 reference ≥100 行时添加目录；SKILL.md 引用时说明"何时需要查阅此文件"。

**Assets 规划**

| 资源名 | 类型            | 使用场景                 |
| ------ | --------------- | ------------------------ |
|        | 模板文件/脚手架 | 当用户 [条件] 时直接复制 |

---

#### 五、自由度分配

为每个步骤/功能标注约束强度，确保匹配任务特性。

| 步骤/功能 | 自由度   | 约束形式             | 理由                   |
| --------- | -------- | -------------------- | ---------------------- |
|           | 高/中/低 | 文本指令/伪代码/脚本 | [为什么选择这个档位？] |

**三档位判断标准**：

- **高自由度（文本指令）**：多种做法皆有效，需上下文判断
  - 问：这个任务有 3 种以上正确做法吗？
  
- **中自由度（伪代码/参数化脚本）**：有推荐模式但允许调整
  - 问：存在"通常这样做"的模式，但需要根据情况微调吗？
  
- **低自由度（具体脚本）**：操作易错或必须严格一致
  - 问：错了会导致数据丢失/不可逆后果吗？

> **反模式警告**：避免全流程使用低自由度（过度刚性）或全流程高自由度（边界缺失）。

---

#### 六、质量检查清单

**Frontmatter 检查**

- [ ] name 符合命名规范（hyphen-case，≤64 字符）
- [ ] description 包含所有触发条件（≤1024 字符，无尖括号）
- [ ] description 明确排除了易混淆的场景

**简洁性检查**
- [ ] 删除了所有辅助文档（README.md、CHANGELOG.md 等）
- [ ] 使用祈使句替代叙述句
- [ ] 解释"为什么"替代罗列禁令（强指令 ≤20%）

**渐进式披露检查**
- [ ] SKILL.md 正文 <500 行
- [ ] 长内容拆分到 references/ 并在 SKILL.md 中引用
- [ ] references 文件 ≥100 行时添加了目录TOC

**自由度检查**

- [ ] 易错操作封装成了脚本
- [ ] 灵活任务使用了文本指令
- [ ] 没有出现"MUST/ALWAYS/NEVER"堆砌
````

#### 最小 Skill 示例：`pdf-text-extractor`

以下是一个符合所有原则的最小 Skill 示例。

````
**文件结构**

```
pdf-text-extractor/
├── SKILL.md
├── scripts/
│   └── extract.py
└── agents/
    └── openai.yaml
```

**SKILL.md**

```markdown
---
name: pdf-text-extractor
description: |
  从 PDF 文件中提取纯文本内容。用于：(1) 提取单页或全文本，
  (2) 保留基本排版结构。当用户需要读取或分析 PDF 文本内容时触发。
  不支持 OCR 图像识别和表格结构化提取。
---

# PDF 文本提取

## 提取纯文本

使用 pdfplumber 库提取文本内容：

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = "\n\n".join(page.extract_text() for page in pdf.pages)
```

保留段落分隔，忽略图像和表格。

## 批量提取

多个文件时调用 `scripts/extract.py`：

```bash
python scripts/extract.py --input dir/ --output results/
```

## 边界说明

此 Skill 不处理：

- 扫描版 PDF（需要 OCR）
- 表格结构化提取（考虑使用 camelot-py）
- 图像提取（使用独立的图像处理 Skill）

```
**scripts/extract.py**（省略实现细节）
```python
# 批量提取脚本，接受 --input 和 --output 参数
```

**解析此示例**：

- ✅ **祈使句**："使用 pdfplumber"、"保留段落分隔"
- ✅ **边界明确**："不支持 OCR"、"不处理表格"
- ✅ **解释原因**：边界说明中解释了为什么排除某些功能（而非简单列禁令）
- ✅ **自由度匹配**：简单提取用文本指令（高自由度），批量操作用脚本（低自由度）
- ✅ **渐进式披露**：description 说明触发条件，Body 展示核心工作流，复杂操作链到脚本
````



---

**使用此大纲的流程**：
1. 按顺序填写各节，每节完成后再进入下一节
2. 填写时对照"反模式警告"自查
3. 完成后运行质量检查清单
4. 参考最小示例验证设计合理性



### 附录B.热门 Skill 推荐

| 分类 | Skill | 简要说明 | Stars | 周安装量 |
|------|-------|----------|------:|---------:|
| **Agent 基础** | [skill-creator](https://skills.sh/anthropics/skills/skill-creator) | 创建新 skill 并迭代改进，含评估与基准测试流程 | 95.6K | - |
| | [find-skills](https://skills.sh/vercel-labs/skills/find-skills) | Agent skill 生态的包管理器，搜索/安装/更新 skill | 10.6K | - |
| | [mcp-builder](https://skills.sh/anthropics/skills/mcp-builder) | MCP Server 开发全流程指南（研究-实现-测试-评估） | 95.6K | 22.0K |
| **思路/写作** | [systematic-debugging](https://skills.sh/obra/superpowers/systematic-debugging) | 系统化调试：四阶段流程（根因调查-模式分析-假设验证-实施修复） | 90.6K | 32.1K |
| | [copywriting](https://skills.sh/coreyhaines31/marketingskills/copywriting) | 专业转化文案写作，涵盖页面结构、CTA、文案风格等完整框架 | 14.2K | 37.6K |
| | [executing-plans](https://skills.sh/obra/superpowers/executing-plans) | 加载计划 -> 批判审查 -> 逐步执行 -> 验证完成的工作流 | 90.6K | 25.1K |
| **UI/UX** | [web-design-guidelines](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) | 基于 Vercel Web Interface Guidelines 的界面规范审查工具 | 23.2K | 171.8K |
| | [frontend-design](https://skills.sh/anthropics/skills/frontend-design) | 创建独特、生产级前端界面，拒绝"AI 风格"，注重美学与创意 | 95.6K | 164.9K |
| | [ui-ux-pro-max](https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/) | 多平台专业 UI/UX 设计智能（含设计系统、品牌、Banner 等子技能） | 43.4K | 65.9K |
| **Web 编程** | [vercel-react-best-practices](https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | React/Next.js 性能优化，62 条规则覆盖 8 大类 | 23.2K | 217.4K |
| | [next-best-practices](https://skills.sh/vercel-labs/next-skills/next-best-practices) | Next.js 最佳实践（RSC 边界、异步模式、路由约定、元数据等） | 725 | - |
| | [test-driven-development](https://skills.sh/obra/superpowers/test-driven-development) | TDD 方法论：红-绿-重构循环，铁律「无失败测试不写生产代码」 | 90.6K | 26.6K |
| **文档操作** | [pdf](https://skills.sh/anthropics/skills/pdf) | PDF 全流程处理：读取、合并、拆分、创建、OCR、水印、加密 | 95.6K | 40.3K |
| | [pptx](https://skills.sh/anthropics/skills/pptx) | PPT 演示文稿创建与编辑，含配色方案、排版指南、QA 流程 | 95.6K | 36.1K |

> 数据来源：[skills.sh](https://skills.sh)，采集时间：2026-03-17。周安装量来自官方统计，"-" 表示未公开。Star 数共享自所属仓库。

### 附录C. Anthropic skill-creator 的框架图

![Skill Evaluation and Review-2026-03-30-083401](/Users/mico/Downloads/Skill Evaluation and Review-2026-03-30-083401.png)
