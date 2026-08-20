# Sidecar Schema

OpenSpec 原生无 `accepted` 状态机。schedule 层在 change 侧挂 sidecar 补齐：

```
openspec/changes/<name>/.auto-spec.yaml
```

## 模板

```yaml
status: active # active | dev-complete | accepted | cancelled
dev_complete_sha: ""
rejection_count: 0
related_files: [] # glob，如 src/foo/**
keywords: []
review_skipped_reason: "" # 仅纯文档/格式任务
updated: "" # ISO 日期
```

## 字段

| 字段 | 设者 | 用途 |
|------|------|------|
| `status` | AI: `active`/`dev-complete`；人类: `accepted`/`cancelled` | 状态机，见 [workflow.md](workflow.md#状态机) |
| `dev_complete_sha` | AI | review 去重与回退检测 |
| `rejection_count` | AI | recover 提示衰减，≥ 3 不再主动提示 |
| `related_files` | AI | recover / level 关联匹配 |
| `keywords` | AI | recover 关联匹配 |
| `review_skipped_reason` | AI | check 跳过 review 的审计记录 |
| `updated` | AI | 排序与陈旧判断 |

## 规则

- sidecar 是 schedule 层私有文件，`openspec archive` 不消费它；archive 前必须由人类把 `status` 设为 `accepted`。
- 一个 change 一个 sidecar，与 change 同生命周期。
