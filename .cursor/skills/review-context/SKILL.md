---
name: review-context
description: Mandatory before code edits on implementation tasks. Read and run when the user requests 实现, 修复, 重构, 新增功能, 改接口, 改 bug, 开发, 续做, 完成, 做完了, pre-commit, 提交, 审查, or 交接. Routes setup|start|sync|check|review|handoff orchestrate task contracts, phase gates, change-snapshot deduplication, and cross-session handoff. After in-scope code lands, auto-run check against acceptance_criteria and trigger review when criteria appear substantially met — do not wait for the user to say 提交.
---

# Review Context

## Entry gate

**Leading word: _contract_.** A task without a named contract path is not started.

When the user request implies application code changes — implementation, bugfix, refactor, new feature, API or field change, or resuming dev work on a branch:

1. **Read this skill file** before exploring or editing application code.
2. Run route **`setup`** when no valid contract exists; run **`start`** when one may exist.
3. **Name the contract path** in the first user-facing response, for example `docs/agents/tasks/<task-id>.md`.
4. Enter **`implementation`** only after the contract lists requirements, acceptance criteria, and in-scope paths.

**Completion criterion:** the contract path is explicit; `python3 .cursor/skills/review-context/scripts/validate_contract.py <contract>` passes, or bootstrap deferral is documented in the contract.

**Skip this gate** only for pure research, explanation, review-only requests, or explicit “do not change code” instructions.

If chat history shows code was already edited without a contract, stop, run `setup` or `sync`, backfill the contract from the diff, then continue.

## Exit gate

**Leading word: _gate_.** Implementation is not done when code is written — it is done when acceptance criteria are checked and review has run.

When in-scope application code changes land during `implementation`:

1. Run route **`check`**: compare the diff and contract against every `acceptance_criteria` item; record met / partial / unmet per item in the contract.
2. When criteria appear **substantially met** — all required items met, or only minor gaps remain with no open blockers — run route **`review`** at phase `verification` in the **same turn**. Do not wait for the user to say 提交, 审查, or confirm completion; review is read-only and safe to run early.
3. Set contract phase to `verification`; append an `implementation-complete` event with criterion checklist and snapshot hash.
4. Report review summary (conclusion, P0–P3 counts, unresolved items) in the user-facing response alongside the implementation summary.

**Completion criterion:** every acceptance criterion has an explicit met/partial/unmet verdict in the contract; a `review` event exists for the current `change_snapshot_hash` at phase `verification`, or dedup shows an identical hash was already reviewed.

**Defer review** only when `in_scope` contains no application code (documentation, comments, formatting only) — record `review_skipped_reason` in the contract and state it in the response.

If criteria are clearly unmet, stay in `implementation`, list remaining gaps, and do not run review yet.

## Ownership

This skill is the orchestration layer. It owns repository bootstrap, task identity, phase state, risk classification, review scope, continuity, and handoff. `.cursor/skills/code-reviewer/` remains the execution layer and owns SOLID, security, performance, and code-quality findings.

Use one contract per task:

`docs/agents/tasks/<task-id>.md`

The contract stores the latest snapshot and an append-only event history. Keep the contract in the repository so a new session or model can recover without relying on chat history.

## Output language

Use the language of the latest user request for all user-facing prose. A Simplified Chinese request produces Simplified Chinese output; an English request produces English output. This applies to setup reports, questions, errors, review summaries, handoffs, and new natural-language text written to the task contract.

Keep machine-facing identifiers unchanged:

- route names, file paths, shell commands, YAML keys, enum values, and `task_id`;
- severity labels `P0`–`P3`, review conclusions, and snapshot hashes;
- code symbols, API names, and quoted user text.

When updating an existing contract, preserve earlier event history verbatim. Write only new snapshot prose and new events in the current user language. Translate structural headings in generated reports and handoffs, but preserve the required fields and values.

## Routes

Run the route named by the user. If the request has no route, infer it:

| Situation | Default route |
| --- | --- |
| New implementation request, no contract | `setup` |
| Resume, new session, or branch work | `start` |
| Requirements or scope changed | `sync` |
| User asks whether a phase is done | `check` |
| In-scope application code just landed; acceptance criteria appear substantially met | `check` then `review` at phase `verification` (same turn, no user prompt needed) |
| User prepares commit or says 提交 | `pre-commit` via `check` then `review` if snapshot hash changed |
| User asks for 审查 | `review` |
| User asks for 交接 or handoff | `handoff` |

Otherwise infer from the contract's current phase:

| Route | Use | Completion criterion |
| --- | --- | --- |
| `setup` | Create or normalize a task contract | A valid contract exists and its identity, requirements, acceptance criteria, and open questions are explicit |
| `start` | Resume a task in a new session or model | The active contract, phase, branch, risks, and unresolved items are reported |
| `sync` | Record changed requirements, decisions, or scope | A new event is appended and acceptance criteria, scope, and risk hints are recalculated |
| `check` | Determine whether the current phase is complete | The contract has an explicit phase state, evidence, risk classification, and next gate |
| `review` | Run a scoped review through `code-reviewer` | A review report exists and its summary is appended to the contract |
| `handoff` | Prepare continuation for another session, model, or collaborator | The handoff contains the contract path, current state, evidence, remaining work, and P0/P1 gate result |

## Bootstrap gate

`setup` begins with a read-only bootstrap check. Run:

```bash
python3 .cursor/skills/review-context/scripts/check_bootstrap.py
```

The check covers only repository integration:

- `AGENTS.md` contains the review-continuity gate block;
- `CLAUDE.md` imports `AGENTS.md` with `@AGENTS.md`.

Use these states:

- `ready`: both integrations are present; continue with task-contract setup;
- `needs-bootstrap`: one or both integrations are absent; show the exact proposed supplement and ask whether to apply it;
- `conflict`: a partial or conflicting integration exists; pause and ask for resolution without overwriting either file.

Apply the supplement only when the user explicitly requests Skill integration or uses `setup --apply-bootstrap`. Load `references/bootstrap.md` for the managed block and patch rules. Verify the check returns `ready` before creating the contract.

After the repository reaches `ready`, later `setup` runs only create or normalize the task contract. `start`, `sync`, `check`, `review`, and `handoff` never modify `AGENTS.md` or `CLAUDE.md`.

## Task identity

Resolve exactly one task in this order:

1. Contract path explicitly named by the user.
2. `task_id` explicitly named in the current request.
3. A contract whose `branch` exactly matches the current branch.
4. A contract referenced by the current PR or Issue.
5. A date plus semantic slug, for example `20260813-context-aware-review`.

When multiple candidates remain after branch matching, pause and ask the user to choose. When contract and branch disagree, mark the conflict and pause; do not overwrite either value. When a PR or Issue is unavailable, continue from the local contract and record that unavailable state.

## Contract lifecycle

### `setup`

1. Run the bootstrap gate. If it is `needs-bootstrap`, propose the supplement; if it is `conflict`, pause.
2. When explicitly authorized, apply the managed bootstrap patch and verify `ready`.
3. Inspect the current branch, status, diff, user request, and relevant repository rules.
4. Select an existing contract with the identity rules above, or copy `docs/agents/tasks/TEMPLATE.md`.
5. Fill the latest snapshot fields: `task_id`, `title`, `status`, `source`, `branch`, `pull_request`, `requirements`, `acceptance_criteria`, `decisions`, `review_state`, `open_questions`, and `updated_at`.
6. Add an initialization event with the source, assumptions, and confirmation state.

Use `status: pending-confirmation` when the contract was inferred from context and the user has not confirmed the requirements. Use `status: closed` only after handoff criteria pass.

Completion means bootstrap is `ready`, or the user has a documented decision to defer it, and `python3 .cursor/skills/review-context/scripts/validate_contract.py <contract>` passes. Every inferred requirement is either confirmed or listed in `open_questions`.

### `start`

Read the contract before reading chat history. Report:

- `task_id`, title, status, branch, and PR/Issue references;
- current phase and evidence;
- requirements and acceptance criteria;
- in-scope and out-of-scope paths;
- risk hints, previous findings, and open questions;
- the next gate.

If the contract is missing, use `setup`. If identity is ambiguous or conflicting, stop and ask for confirmation.

Completion means the active contract and next action are named explicitly, with no silent identity or branch substitution.

### `sync`

Treat requirements as append-only. Do not rewrite old events. Append a `requirement-change`, `decision`, or `scope-change` event containing:

- timestamp and source;
- old and new requirement or decision;
- affected acceptance criteria;
- affected in-scope/out-of-scope paths;
- new risk hints;
- whether user confirmation is required.

Then update only the latest snapshot. Recalculate acceptance criteria and review scope when the change affects behavior, exports, APIs, permissions, data writes, or shared modules.

Completion means the event is appended, the snapshot reflects the new truth, and every affected criterion and scope entry is accounted for.

## Phase and risk gates

The contract is authoritative for phase state. Completion language in chat is supporting evidence only.

Use these phases:

- `understanding`: requirements, constraints, and acceptance criteria are known;
- `implementation`: in-scope changes are being made;
- `verification`: tests, lint, build, and scenario evidence are being collected;
- `pre-commit`: the final diff and review gate are being checked;
- `handoff`: continuation data is complete.

Classify risk from the contract, changed paths, diff content, call chains, and permissions:

- High risk: authentication or authorization, payment or balance, data writes or migrations, public/shared APIs, global state, routing, security boundaries, or behavior changes in critical paths.
- Low risk: copy, comments, formatting, documentation, or pure renames that do not alter behavior, exports, APIs, or permissions.
- When evidence is unclear, treat a potentially high-risk change as high risk and ask when phase signals conflict.

Every **`verification`** exit and every **`pre-commit`** require a scoped `review` for the current snapshot. Deduplicate: skip only when `task_id + phase + change_snapshot_hash` already has a completed review event. **`pre-commit`** re-runs `review` only when the hash differs from the last reviewed snapshot.

Documentation-only tasks with no application code in `in_scope` may skip `review`; record `review_skipped_reason` in the contract.

Deduplicate reviews by:

`task_id + phase + change_snapshot_hash`

Do not rerun a review when all three values match a completed review event. Re-run when any value changes.

## Change snapshot

Calculate a deterministic SHA-256 snapshot from all in-scope tracked and untracked changes. Sort paths, include each path and status, and include its exact bytes. Record the resulting `change_snapshot_hash` in the review event and latest `review_state`.

The snapshot must include new files. A hash based only on `git diff` is incomplete when untracked files are in scope.

## `review`

Before dispatch:

1. Resolve the task contract and phase.
2. Calculate the current change snapshot.
3. Filter the diff to contract `in_scope`; list excluded changes under `out_of_scope` and do not review them.
4. Reuse the previous findings and unresolved items.
5. Skip only an unchanged snapshot already reviewed for the same task and phase.

Give `code-reviewer` this exact structured context:

```yaml
task_id: <task-id>
phase: <understanding|implementation|verification|pre-commit|handoff>
requirements: [...]
acceptance_criteria: [...]
in_scope: [...]
out_of_scope: [...]
risk_hints: [...]
previous_findings: [...]
change_snapshot_hash: <sha256>
```

Instruct it to review only the scoped changes, return the complete Markdown report in the user's language, preserve its existing P0–P3 severity structure, and do not modify code.

After the report:

1. Record `overall_conclusion`, counts for `P0`, `P1`, `P2`, and `P3`, the hash, and unresolved items in the latest snapshot.
2. Append a `review` event with timestamp, phase, scope, hash, conclusion, counts, and unresolved items.
3. Keep the full report in the current response or the repository report location already used by the review workflow; the contract stores the summary, not a duplicate full report.

Completion means the report covers only the contract scope and the contract contains a matching review summary and hash.

## `check`

For each phase, record evidence rather than relying on a completion phrase:

| Phase | Required evidence |
| --- | --- |
| `understanding` | requirements, constraints, acceptance criteria, and open questions |
| `implementation` | changed paths, scope decision, per-criterion met/partial/unmet verdict, and — when substantially met — a `verification` review event for the current snapshot |
| `verification` | review summary for current snapshot, commands/results if run, residual risk |
| `pre-commit` | final snapshot hash, review summary, and no unresolved P0/P1 |
| `handoff` | contract path, branch, current phase, evidence, next action, and unresolved items |

If a high-risk phase has unclear evidence, pause. If a low-risk change is clearly filtered, record the skip. A phase is complete only when all required evidence is present in the contract or the current response.

## `handoff`

Use this output:

```markdown
# 任务交接：<task_id>

- 契约：`docs/agents/tasks/<task-id>.md`
- 分支：`<branch>`
- 阶段：`<phase>`
- 状态：`<status>`
- 审查门槛：`PASS` 或 `BLOCKED`
- 快照：`<change_snapshot_hash>`

## 已完成证据
- ...

## 剩余工作
- ...

## 未决问题
- ...

## 审查发现
- P0: <count>
- P1: <count>
- P2: <count>
- P3: <count>
- 未解决：...

## 下一步
...
```

P0 or P1 findings block handoff and keep the contract open. P2 and P3 findings are reported but do not block handoff. Identity conflicts, missing contracts, and unresolved high-risk phase signals also block handoff.

Completion means the handoff is reproducible from the contract and clearly states `PASS` or `BLOCKED`.

## Resources

- Contract format: `docs/agents/tasks/TEMPLATE.md`
- Bootstrap rules: `references/bootstrap.md`
- Evaluation scenarios: `evals/evals.json`
- Contract validator: `scripts/validate_contract.py`
- Bootstrap checker: `scripts/check_bootstrap.py`
- Skill and eval validator: `scripts/validate_skill.py`
- Review execution layer: `../code-reviewer/SKILL.md`
