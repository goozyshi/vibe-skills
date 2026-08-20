# 归档摘要模板

`/archive` 按此格式生成摘要，保存到 `specs/summaries/{spec-id}.summary.md`。

---

```markdown
---
id: REQ-XXX-000
title: 需求标题
summary: 一句话描述
keywords: [关键词]
related_files: [src/相关文件]
status: archived
accepted_date: YYYY-MM-DD
archived_date: YYYY-MM-DD
---

## 验收标准（完整保留）

- [x] 标准 1
- [x] 标准 2

## 核心需求点（缩减为一行列表）

- 功能点 1、功能点 2、功能点 3
```

## 保留与丢弃

**强制保留**：id、title、summary、keywords、related_files、验收标准全文。

**丢弃**：范围边界、平台差异、待办/风险（开发期章节）。

## cancelled 状态

`cancelled` 的 spec：
- `status: archived`（附注 cancelled）
- `accepted_date` 替换为 `cancelled_date`
- 验收标准保留原始勾选状态（可能部分未勾选）
