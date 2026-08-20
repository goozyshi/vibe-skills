# Spec 文件模板

`/init` 将此内容写入 `specs/active/_template.md`。`/prd-to-spec` 用此结构生成新 spec。

---

```markdown
---
id: REQ-XXX-000
title: 需求标题
summary: 一句话描述
keywords: [关键词1, 关键词2]
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

## Frontmatter 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `id` | 是 | 全局唯一，格式 `REQ-{模块}-{序号}`，不随文件名变化 |
| `title` | 是 | 需求标题 |
| `summary` | 是 | 一句话描述，用于索引和匹配 |
| `keywords` | 是 | 关键词数组，用于上下文匹配 |
| `related_files` | 是 | 关联文件路径数组，支持 glob |
| `platforms` | 是 | `common`, `ios`, `android` 可多选 |
| `status` | 是 | `active` / `dev-complete` / `accepted` / `cancelled` / `archived` |
| `progress` | 是 | 0-100，按验收标准通过比例计算 |
| `updated` | 是 | 最后更新日期 |
| `dev_complete_sha` | 否 | dev-complete 时的 commit SHA |
| `rejection_count` | 否 | 恢复确认衰减计数，≥3 时不再主动提示，默认 0 |
| `prd_link` | 否 | 外部 PRD 链接（仅人类参考） |

## 内容约束

- 每个功能点、验收标准只写一行，禁止段落。
- 背景/目标最多 2 行，超过用 `prd_link` 引用。
- 文件总行数不超过 200 行，超过提示拆分。
