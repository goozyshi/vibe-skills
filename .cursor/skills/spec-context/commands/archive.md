# /archive

手动归档 spec。

## 前置条件

Spec 状态必须为 `accepted` 或 `cancelled`。其他状态 → 拒绝，提示用户先验收或取消。

## 步骤

### 1. 确认目标

- `/archive` 无参数 → 列出所有 `accepted`/`cancelled` 的 spec，询问归档哪些。
- `/archive REQ-xxx` → 归档指定 spec。

### 2. 生成摘要

按 [summary-template.md](../references/summary-template.md) 格式生成摘要，保存到 `specs/summaries/{spec-id}.summary.md`。

强制保留：id、title、summary、keywords、related_files、验收标准全文。
丢弃：范围边界、平台差异、待办/风险。

### 3. 移动文件

事务式操作：
1. 复制 spec 到 `specs/archive/YYYY-MM/`。
2. 确认复制完整。
3. 删除 `specs/active/` 中的原文件。

任一步失败 → 回滚，通知用户。

### 4. 更新索引

运行 `node specs/scripts/generate-spec-index.js`。

### 5. 报告

告知用户归档了哪些 spec，摘要保存在哪里。

完成标志：spec 已移至 archive/，摘要已生成，索引已更新。
