# Sidecar Schema

OpenSpec 原生无 `accepted` 状态机。schedule 层在项目根目录保存 state：

```
.auto-spec/changes/<name>.yaml
```

## 模板

```yaml
status: active # active | dev-complete | accepted | cancelled
review_snapshot: ""
rejection_count: 0
related_files: [] # glob，如 src/foo/**
keywords: []
review_skipped_reason: "" # 仅纯文档/格式任务
updated: "" # ISO 日期
```

## 字段

| 字段                    | 设者                                                                            | 用途                                         |
| ----------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| `status`                | AI: `active`/`dev-complete`；人类: `accepted`/`cancelled`                      | 状态机，见 [workflow.md](workflow.md#状态机) |
| `review_snapshot`       | AI                                                                              | in_scope 内容快照；仅用于 review 去重        |
| `rejection_count`       | AI                                                                              | recover 提示衰减，≥ 3 不再主动提示           |
| `related_files`         | AI                                                                              | recover / level 关联匹配                     |
| `keywords`              | AI                                                                              | recover 关联匹配                             |
| `review_skipped_reason` | AI                                                                              | check 跳过 review 的审计记录                 |
| `updated`               | AI                                                                              | 排序与陈旧判断                               |

## 规则

- sidecar 是 schedule 层私有文件；不能驱动或替代 OpenSpec archive。
- archive 前必须由人类设为 `accepted`。归档状态以 OpenSpec 的状态和 change 位置为准。
- 一个 change 一个 state 文件；archive 成功后删除，历史由 OpenSpec archive 保留。
