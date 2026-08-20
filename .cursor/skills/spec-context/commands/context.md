# /context \<id\>

手动指定当前 spec 上下文，覆盖 AI 自动判断。

## 步骤

1. 在 `specs/index.json` 中查找指定 id。
2. 未找到 → 扫描 `specs/active/` 按 id 查找。仍未找到 → 报错。
3. 找到 → 加载该 spec 为当前上下文。
4. 若 spec 的 `rejection_count > 0`，重置为 0 并更新文件（用户主动恢复 = 衰减清零）。
5. 告知用户"已切换上下文到 {id}: {title}，progress: {progress}%"。
6. 若 spec 有未完成验收标准，列出待完成项。

完成标志：上下文已切换，用户已确认。
