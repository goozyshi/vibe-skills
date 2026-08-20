# /review

手动触发或 L2 变更自动触发的 code review。

## 前置条件

- 存在关联的 active spec。
- Spec 已更新完毕（spec 更新是 review 的前置条件）。
- 若无关联 spec，提示用户先创建或指定。

## 去重

自动触发的 L2 review 遵循去重规则：

```
if 当前 git rev-parse HEAD == spec.dev_complete_sha
   且 spec 未从 dev-complete 回退为 active
→ 跳过 review，告知用户"代码未变化，沿用上次 review 结果"
```

手动 `/review` 始终执行（用户明确要求覆盖去重）。

## 步骤

### 1. 收集 diff

- **代码 diff**：`git diff $(git merge-base HEAD <base-branch>)..HEAD`
- **Spec diff**：spec 文件在 merge-base 时的版本 vs 当前版本。新建 spec 则整个文件视为 diff。

### 2. 需求一致性检查

逐条读取 spec 的"验收标准"，对照代码 diff 检查：

| 检查项 | 方法 |
|--------|------|
| 验收标准是否已实现 | 逐条对照代码 |
| 是否引入 spec 之外的行为 | 检查 diff 中无 spec 覆盖的新功能 |
| 是否有遗漏的验收标准 | 对比 spec 变更与代码变更范围 |
| 平台适配 | 检查 `platforms` 字段要求 |

### 3. 代码质量检查

运行时 skill 发现（按 [workflow.md](../references/workflow.md#skill-discovery)），按发现结果委托：

- `code_review` skill 存在 → 委托执行，合并结果。
- `security_review` skill 存在 → 委托执行。
- 均不存在 → 跳过代码质量检查，仅做需求一致性。

问题级别映射：`P0/P1 → 阻塞，P2 → 警告，P3 → 建议`。

### 4. 生成报告

按 [review-report-format.md](../references/review-report-format.md) 格式输出。

### 5. 迭代修复

若存在 **阻塞级** 问题：

1. AI 继续修改代码。
2. 重新执行步骤 1-4。
3. **最多迭代 3 次**。

终止保护：
- 本轮问题数 ≥ 上一轮 → 问题不收敛，立即终止，上报用户。
- 每次迭代记录变更摘要，防止振荡（改 A 破 B → 改 B 破 A）。

### 6. 完成

- 全部通过 → 设 `status: dev-complete`，记录 `dev_complete_sha`（当前 HEAD），在"待办/风险"列出可能遗漏。
- 3 次迭代后仍有未解决阻塞 → 设 `status: dev-complete`（标记"部分通过"），报告中列出未解决项，交用户决策。
- 运行 `node specs/scripts/generate-spec-index.js` 更新索引。
- 向用户展示报告，等待验收。

完成标志：报告已生成并展示，spec 状态已更新，索引已刷新。
