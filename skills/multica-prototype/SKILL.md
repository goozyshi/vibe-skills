---
name: multica-prototype
description: Build standalone HTML prototypes for new, modified, or migrated pages. Use when the user asks to prototype a page, explore layout variants, or verify a navigation migration.
---

# Multica Prototype

Generate standalone, interactive, CDN-powered HTML prototypes matching the repository's UI framework. Output lives in `multica-prototypes/`.

**Prerequisite**: Work on branch `agent/prototype`. Create if absent, merge latest main before starting.

```bash
git checkout -B agent/prototype && git merge main --no-edit
```

## Step 1: Scope & Scenario

Determine category, then apply constraints:

| Scenario | Focus |
|----------|-------|
| **New** | Full page: search form, table/cards, actions |
| **Modify** | Retain all existing fields; highlight delta only |
| **Migrate** | Navigation topology comparison only — content unchanged, show reorganized entry point |

**Migrate rendering spec:**
- **Comparison zone**: old path → new path (e.g. `公会数据 > OneLink数据` → `运营管理 > 渠道投放 > OneLink报表`), visually paired with arrow.
- **New navigation shell**: render the target menu/tab structure with destination highlighted.
- **Content placeholder**: single card with text stating content is unchanged — e.g. `「OneLink数据」视图内容保持不变，仅入口重组归入此处`.

Constraints (all scenarios):
- **One HTML per page.** Each prototype renders one page's final state. Same-page list/detail drill-down uses state toggle (`mode: 'list' | 'detail'`). Composite requests (e.g. modify + migrate on the same page): render the final form directly — shell reflects the new nav position, content reflects field changes — no extra "migration comparison view" unless user explicitly asks for before/after.
- **View toggle only for same-page drill-down** (list ↔ detail). Never use view switching to pack different scenario types into one file.
- **Two-tier fidelity:** Delta scope (user-requested additions/changes) = 100% precision, zero omissions. Baseline (existing fields) = preserve structure, prune long enums to 3–5 samples.
- **Lean shell:** Sidebar shows only the active module group title + the single active menu item (1 group, 1 item). Tabs show only the active tab. Header shows logo + env label only.
- **Multi-variant** only when user explicitly requests layout exploration (N=2–3, floating switcher bar at bottom with click, number keys 1/2/3 for direct jump, and arrow keys ←/→ for prev/next).

---

## Step 2: Extract Stack & Requirements

1. Read `package.json` → pick CDN deps (Vue 3 + Element Plus / React + Ant Design).
2. Inspect target view file → replicate exact table column hierarchy.
3. List every user-requested field, enum value, and interaction. Each must map 1:1 to a concrete UI element before generation starts.
4. Resolve file path: `multica-prototypes/[module]/[YYYYMMDD]_[简短中文需求].html`
   - Module aligns with `src/views/` directory name; for **migrate** scenarios use the **target** module, not source; fallback `common`.

**Completion criterion**: every requested item has a target UI element assignment; zero unmapped items.

---

## Step 3: Generate HTML

Write a single-file HTML prototype following [references/template-html.md](references/template-html.md).

Hard rules:
1. **Explicit closing tags** — never self-close custom elements (`<el-table-column />` ✗ → `<el-table-column></el-table-column>` ✓). Browser HTML parser breaks otherwise.
2. **Delta highlighting via CSS class only** — see template for exact tokens. Label text stays clean production names, no text markers.
3. **Self-contained** — zero build steps, opens in browser via file URL.
4. **Metadata** — HTML comment `@prototype-meta` block at file top (see template).

---

## Step 4: Deliver & Confirm

1. Present: file path (absolute + workspace-relative) + delta checklist confirming all requested items rendered.
2. Ask user to open and verify: *"请在浏览器中打开原型，确认是否采纳？"*
3. **Pre-commit barrier**: do not git commit until user explicitly approves.
4. If rejected: `rm -f` the draft, iterate or pivot.

---

## Step 5: Commit (after approval only)

```bash
git add multica-prototypes/[module]/[YYYYMMDD]_[简短中文需求].html
git commit -m "prototype: [简短中文需求] ([scenario])"
```
