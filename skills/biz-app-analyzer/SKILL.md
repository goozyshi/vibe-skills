---
name: biz-app-analyzer
description: Analyze a business application's codebase and generate a structured AI knowledge base — four Markdown documents that capture project context, architecture, development patterns, and domain glossary. Use this skill whenever the user mentions "analyze project", "generate project docs", "help AI understand my project", "project knowledge base", "project context", or complains that "AI doesn't understand my project" or "I have to re-explain the project every time". Also use it when the user provides a PRD but the AI lacks project context to act on it, or when onboarding to an unfamiliar codebase. Even if the user just says "look at this project" or "what does this codebase do", this skill is likely the right tool.
---

# Biz App Analyzer

Generate a structured AI knowledge base from any business application codebase. The output is a set of Markdown documents that give future AI conversations deep understanding of the project — its purpose, architecture, mechanisms, development patterns, and domain vocabulary.

## What This Skill Produces

Four documents, saved to `.ai-docs/` in the project root:

| Document | Core Question It Answers |
|----------|------------------------|
| `PROJECT_CONTEXT.md` | What is this project, how is the code organized, and how do things work under the hood? |
| `DEV_PATTERNS.md` | When given a new requirement, what's the standard way to implement it in this project? |
| `MODULE_MAP.md` | For a specific page/module, what routes, APIs, stores, and components are involved? |
| `GLOSSARY.md` | What do project-specific terms mean, and how do PRD terms map to code? |

Together these documents enable an AI to behave like a developer who has spent months on the project — knowing where things are, how things connect, and what patterns to follow.

## Execution Flow

The analysis runs in five phases. Each phase builds on the previous one's findings. For detailed instructions on each phase, read the corresponding reference file.

### Phase 1: Project Scanning

Read `references/phase-1-scanning.md` for detailed instructions.

Identify what this project is at a technical level. Locate the dependency manifest (package.json, requirements.txt, go.mod, Cargo.toml, etc.), scan the source directory tree, read build configuration, and extract environment variable names.

**What to read:** Dependency manifest, build config files, `.env*` files (names only), source directory tree (3 levels deep).

**What to produce:** A mental model of the tech stack, directory layout, and environment setup. This guides all subsequent phases.

### Phase 2: Context Analysis

Read `references/phase-2-context-analysis.md` for detailed instructions.

Understand how the project works by analyzing its core mechanisms — not file-by-file, but as interconnected systems. Find and analyze these five mechanisms:

1. **Request layer** — How HTTP requests are made, authenticated, and error-handled
2. **Routing & navigation** — How URLs map to pages, how navigation guards work
3. **State management** — What data is shared across components and how
4. **Auth & permissions** — How users are authenticated and how access is controlled
5. **Shared capabilities** — What reusable components, hooks, and utilities exist and how they're meant to be used together

**What to produce:** Fill in the `PROJECT_CONTEXT.md` template from `references/templates/`.

### Phase 3: Pattern Extraction

Read `references/phase-3-pattern-extraction.md` for detailed instructions.

Discover how developers in this project typically build things. Sample 2-3 representative pages from different business modules, read their full source code, and identify recurring structural patterns — the "recipes" that get repeated across the codebase.

**What to produce:** Fill in the `DEV_PATTERNS.md` template from `references/templates/`.

### Phase 4: Module Mapping

Read `references/phase-4-module-mapping.md` for detailed instructions.

Build an index of every page/module and its dependencies. For each page, extract which route it serves, which APIs it calls, which stores it uses, and which shared components it imports.

**What to produce:** Fill in the `MODULE_MAP.md` template from `references/templates/`.

### Phase 5: Glossary Generation

Read `references/phase-5-glossary.md` for detailed instructions.

Extract domain-specific vocabulary from all previous phases. Identify terms that a newcomer (human or AI) would not immediately understand — both business terms and project-specific technical terms.

**What to produce:** Fill in the `GLOSSARY.md` template from `references/templates/`.

### Finalization: Meta File and Cursor Rule

After all five phases are complete and the four documents are written to `.ai-docs/`, do two more things:

**1. Write `.ai-docs-meta.json`** — a snapshot of the project's current state, used by the update mode to detect changes later. The structure:

```json
{
  "generated_at": "ISO 8601 timestamp",
  "project_root": "absolute path",
  "files_snapshot": {
    "views_modules": ["list of top-level directories under views/"],
    "pages": ["list of all .vue/.tsx page file paths under views/"],
    "components": ["list of files/directories under components/"],
    "hooks": ["list of files under hooks/ or composables/"],
    "stores": ["list of files under store/ or stores/"],
    "critical_files": {
      "path/to/request-wrapper": "last modified ISO timestamp",
      "path/to/router-entry": "last modified ISO timestamp",
      "path/to/auth-guard": "last modified ISO timestamp",
      "path/to/main-entry": "last modified ISO timestamp",
      "package.json": "last modified ISO timestamp"
    }
  }
}
```

**2. Generate `.cursor/rules/ai-docs.mdc`** — a Cursor Rule that tells future AI sessions how to consume the knowledge base. Read `references/cursor-rule-template.md` for the template. This rule ensures that AI automatically reads `PROJECT_CONTEXT.md` for context and checks document freshness before starting work.

## Output Quality Standards

### PROJECT_CONTEXT.md

This is the most important document. An AI reading only this file should understand 80% of what it needs to work in the project. Quality checks:

- The project overview should make sense to someone who has never seen the codebase. Explain what the product does, who uses it, and why it exists — not just "a Vue 3 project".
- Every mechanism must describe the **flow**, not just list files. "A request goes through proxy.js which adds auth headers, hits the backend at /proxy/maidocha_svr/*, checks for 20x status codes, and extracts data from response.content" is useful. "proxy.js handles API requests" is not.
- Shared components must document their **collaboration patterns**, not just their Props. "CustomTable watches readParam for changes and auto-fetches data from readURL" tells the AI how to use it. A Props table alone does not.
- Include concrete examples where they clarify a mechanism. A snippet of how a typical page calls an API is worth more than an abstract description.

### DEV_PATTERNS.md

This document bridges understanding and action. An AI reading a PRD should be able to match the requirement to a pattern and know exactly what files to create and modify. Quality checks:

- Each pattern must have a **trigger condition** — what kind of PRD requirement maps to this pattern.
- Each pattern must list the **complete set of files** to create and modify, including side-effects like route registration and i18n entries.
- Each pattern must name a **reference page** — a real existing page that exemplifies the pattern, so the AI can read it as a concrete template.
- Patterns should be ordered by frequency. The most common pattern first.

### MODULE_MAP.md

This is a lookup table. When an AI needs to modify a specific page, it checks here to understand the blast radius. Quality checks:

- Every page should have its route path, API endpoints, stores, and component dependencies listed.
- Group by business module for easy scanning.
- For large projects (50+ pages), focus on key pages per module rather than exhaustive listing.

### GLOSSARY.md

This prevents misunderstanding. Quality checks:

- Include both business terms (what the domain calls things) and technical terms (what the codebase calls things).
- If PRD language differs from code language, explicitly map between them.
- Keep definitions concise — one line per term is ideal.

## Analysis Principles

These principles apply across all phases. They represent the difference between a document that merely describes files and one that truly transfers understanding.

### Analyze mechanisms, not files

Don't produce a tour of the filesystem. Instead, trace how things actually work end-to-end. "When a user visits a page, what happens?" is a better organizing question than "What does router/index.ts contain?"

Files are containers for mechanisms. The mechanism is what matters. A request might flow through three files — describe the flow once, mentioning the files as waypoints.

### Document connections, not islands

A component's value is not in what Props it accepts — it's in how it collaborates with other parts of the system. CustomTable's readParam + readURL pattern, combined with CustomSearchBar's @update event, forms a cohesive data-fetching mechanism. Document that mechanism, not two isolated component descriptions.

Similarly, a Store's value is in which pages consume it and how. An API endpoint's value is in which page calls it and what triggers the call.

### Capture patterns, not instances

If ten pages follow the same CRUD structure, describe the pattern once and list which pages follow it. Don't repeat the same structure ten times. This is both more concise and more useful — when the AI builds page eleven, it needs the pattern, not a list of examples.

### Serve action, not comprehension

Every piece of information should help the AI make a decision. Ask: "If I were implementing a PRD requirement, would this information help me decide what to do?" If not, it's noise.

"The project uses Pinia for state management" is trivia. "User permissions are stored in permissStore — read permissStore.userInfo.side_menus to check menu access, and call permissStore.getUser() in route guards to refresh auth state" is actionable.

## Adapting to Different Project Types

This skill works with any business application. The five mechanisms in Phase 2 exist in virtually every app — they just manifest differently.

**Frontend apps** (SPA, SSR): All five mechanisms are typically present. The request layer might be axios/fetch wrappers. Routing is client-side. State management varies by framework. Shared capabilities include UI components and composables/hooks.

**Backend services** (API servers, microservices): The "request layer" becomes the API framework's middleware and handler pattern. "Routing" becomes API route definitions. "State management" becomes database models and caching. "Shared capabilities" becomes middleware, validators, and utility modules.

**Full-stack apps** (Next.js, Nuxt, etc.): Analyze the frontend and backend aspects separately, then document how they connect (API routes, server actions, data fetching patterns).

**Mobile apps** (React Native, Flutter): Similar to frontend apps but with platform-specific navigation patterns and native module integrations.

If a mechanism doesn't exist in a project (e.g., a simple CLI tool has no routing), skip it. Don't force the framework — document what's actually there.

## Update Mode

When the user says "update project docs", "refresh the knowledge base", or similar — don't rerun the full analysis. Instead, run a lightweight incremental update.

Read `references/update-mode.md` for the detailed detection and update procedure.

The core idea: read `.ai-docs-meta.json` (generated during the initial run), compare it against the current project state, and determine what changed. Changes fall into three tiers:

**Tier 1 — Auto-fixable.** Pages added or removed. Update `MODULE_MAP.md` by reading the new page's imports (for additions) or removing the entry (for deletions). No user interaction needed beyond confirmation.

**Tier 2 — Targeted update.** New shared components, hooks, or stores added. Read the new files, analyze their interface and purpose, and update the relevant section of `PROJECT_CONTEXT.md`. Ask the user to confirm the additions look right.

**Tier 3 — Full regeneration recommended.** Architectural changes detected (request wrapper, router guards, auth mechanism modified), new business modules appeared, or package.json has major dependency changes. Inform the user and suggest rerunning the full analysis. The existing documents are likely stale in ways that targeted patches can't reliably fix.

After any update, rewrite `.ai-docs-meta.json` with the new snapshot.

## After Generation

Once the four documents are generated in `.ai-docs/` (or updated via Update Mode):

1. **Cursor Rule auto-generated**: The Finalization step creates `.cursor/rules/ai-docs.mdc`, which tells future AI sessions to read `PROJECT_CONTEXT.md` for context and check document freshness. If this rule already exists (from a previous run), it will be overwritten with the latest version.

2. **Other documents on demand**: `DEV_PATTERNS.md`, `MODULE_MAP.md`, and `GLOSSARY.md` are read by AI when relevant — when implementing a feature, modifying a specific module, or encountering unfamiliar terms. The Cursor Rule includes guidance on when to consult each document.

3. **Freshness checking**: The generated Cursor Rule instructs AI to read `.ai-docs-meta.json` and compare against the current project state before starting work. If significant drift is detected, the AI will suggest running this skill in Update Mode.

## Limitations

Be upfront about what this skill cannot do:

- Analysis is based on static code reading. It does not execute code, run tests, or observe runtime behavior. Dynamic patterns (like plugin systems or reflection-heavy code) may be incompletely captured.
- The quality of generated documents depends on how well-structured the project is. A chaotic codebase with no consistent patterns will produce less useful output — but the analysis will honestly reflect that chaos rather than invent patterns that don't exist.
- Business domain understanding is inferred from code structure, naming, and comments. If the codebase uses cryptic naming with no comments, domain analysis will be shallow. The glossary section will flag terms it cannot confidently define.
- For monorepos with multiple distinct applications, run the analysis separately on each application's source directory rather than on the repo root.
