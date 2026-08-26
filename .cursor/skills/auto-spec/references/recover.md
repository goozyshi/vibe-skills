# Recover

Read `<openspec> list --json` before chat history. For each active change, read schedule context when it exists.

```text
related_files intersects the request → load that change
keywords intersects the request      → load that change
neither intersects                    → do not interrupt
ambiguous                              → ask whether the request belongs to the change
```

After a related change is confirmed, dispatch `start`. A missing schedule-context file does not change OpenSpec state; rebuild only the minimal related-file and keyword context needed for recovery.

**Completion criterion:** the response names the related active change and next dispatch action, or explicitly records that no active change is relevant.
