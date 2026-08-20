# /find-spec

查找已有 spec。

## 输入

`/find-spec [关键词或文件路径]`

## 步骤

1. 读取 `specs/index.json`。
2. 按以下维度匹配：
   - `keywords` 包含用户输入的关键词
   - `title` 或 `summary` 包含关键词
   - `related_files` 匹配用户输入的文件路径（glob）
3. 若 index.json 无匹配，扫描 `specs/summaries/` 搜索归档 spec。
4. 展示匹配结果：id、title、status、progress、path。
5. 无匹配 → 告知用户，建议使用 `/prd-to-spec` 创建新 spec。

完成标志：向用户展示了搜索结果或无匹配提示。
