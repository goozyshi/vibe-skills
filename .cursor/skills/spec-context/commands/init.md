# /init

初始化 spec 系统。幂等——已存在的结构跳过，不覆盖。

## 步骤

### 1. 创建目录结构

检查并创建：

```
specs/active/
specs/archive/
specs/summaries/
```

已存在 → 跳过。

完成标志：三个目录均存在。

### 2. 放置模板

将 [spec-template.md](../references/spec-template.md) 的内容写入 `specs/active/_template.md`。

已存在 → 跳过，不覆盖用户修改。

### 3. Skill 发现（运行时，不持久化）

按优先级扫描以下路径，读取每个 `SKILL.md` 的 frontmatter（`name`、`description`）：

```
1. <workspace>/.cursor/skills/
2. <workspace>/.agents/skills/
3. ~/.cursor/skills-cursor/
4. ~/.agents/skills/
```

按关键词匹配映射到 spec 系统角色：

| 角色 | 匹配关键词 |
|------|-----------|
| `code_review` | `code-review`, `reviewer` |
| `security_review` | `security`, `review-security` |
| `bug_detection` | `bugbot`, `bug` |
| `merge_conflict` | `merge-conflict`, `resolve` |

发现结果仅在内存中持有，随会话结束释放。Skill 路径是本地环境相关的，持久化到仓库会在跨平台时失效。

完成标志：扫描完所有路径，记录发现结果。

### 4. 注入 AGENTS.md gate

读取 [agents-rules-template.md](../references/agents-rules-template.md)（薄 gate，workflow 在 [workflow.md](../references/workflow.md)）。

三态检测：

1. **ready** — `AGENTS.md` 存在，标记 `<!-- spec-system-start -->` / `<!-- spec-system-end -->` 间内容与模板一致 → 跳过。
2. **needs-inject** — `AGENTS.md` 不存在，或存在但无标记 → 创建文件或在末尾追加（用标记包裹）。
3. **conflict** — 标记存在但内容与模板不一致（用户在标记间添加了自定义规则）→ 展示差异，询问用户"覆盖/合并/跳过"，不自动覆盖。

完成标志：`AGENTS.md` 包含 spec continuity gates，且无未解决 conflict。

### 5. 跨平台规则桥接

`AGENTS.md` 是规则的唯一真相源。其他平台通过桥接文件引用它：

| 平台 | 桥接文件 | 桥接内容 |
|------|---------|----------|
| Claude Code | `CLAUDE.md` | `@AGENTS.md` |
| Gemini CLI | `GEMINI.md` | `@AGENTS.md` |
| Windsurf | `.windsurfrules` | `@AGENTS.md` |

Cursor 和 Codex 原生加载 `AGENTS.md`，无需桥接。

处理逻辑（每个桥接文件独立判断）：

1. 文件不存在 → 创建，写入桥接行。
2. 文件存在且已包含 `@AGENTS.md` → 跳过。
3. 文件存在但无 `@AGENTS.md` → 在文件末尾追加桥接行，不覆盖已有内容。

完成标志：所有桥接文件均包含 `@AGENTS.md` 引用。

### 6. 复制脚本

将 `scripts/` 下三个脚本复制到 `specs/scripts/`（项目内）。已存在且版本相同 → 跳过。

### 7. 生成 index.json

运行 `node specs/scripts/generate-spec-index.js`。首次运行无 spec 时生成空数组。

### 8. 报告

向用户输出：
- 新创建了什么
- 跳过了什么
- 发现了哪些可复用 skill（含路径）
- 未找到匹配的角色（回退方案说明）
- AGENTS.md 状态（ready/needs-inject/conflict 及处理结果）
- 跨平台桥接状态（每个文件：已存在/新建/追加）
