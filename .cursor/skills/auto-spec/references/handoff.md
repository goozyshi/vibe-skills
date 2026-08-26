# Handoff

Handoff is a dispatch result, not an OpenSpec lifecycle state.

For an L2 change after final review, report:

```markdown
## 验收检查
| # | 验收标准 | 状态 | 说明 |

## 代码质量检查
P0: <count>
P1: <count>
P2: <count>
P3: <count>
结论：可人工验收 / BLOCKED
```

Report `可人工验收` only when every required acceptance item passes, required commands pass, and the final review has no P0/P1 finding. Otherwise report `BLOCKED` with remaining evidence gaps.

The human decides whether to invoke the official OpenSpec archive flow. On the next session, OpenSpec’s active/archive location is the source of truth.

**Completion criterion:** the response identifies the change, current snapshot, evidence, review conclusion, and the human’s next decision.
