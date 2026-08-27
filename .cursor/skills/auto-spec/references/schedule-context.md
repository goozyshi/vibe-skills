# Schedule Context

Schedule context is optional metadata for routing and review deduplication. It is not an OpenSpec artifact or lifecycle state.

```text
.auto-spec/changes/<name>.yaml
```

```yaml
related_files: []
keywords: []
last_review_snapshot: ""
last_review_type: "" # interim | final
last_review_conclusion: ""
last_review_report: "" # report reference
interim_reviewed: false
```

| Field                                                          | Purpose                                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `related_files`, `keywords`                                    | Route a later request to an active change.                                 |
| `last_review_snapshot`, `last_review_type`                     | Reuse a review only for the same snapshot and review type.                 |
| `last_review_conclusion`, `last_review_report` | Persist the latest review result and its report reference. |
| `interim_reviewed`                                             | Limit a high-risk change to one interim review.                            |

OpenSpec decides whether a change is active or archived. Remove stale schedule context only after OpenSpec reports the change archived.
