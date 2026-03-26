<div align="center">

# Biz App Analyzer

### AI keeps forgetting your project. This gives it a permanent memory.

[Installation](#installation) · [Features](#features) · [Usage](#usage) · [Workflow](#workflow) · [Structure](#structure) · [References](#references) · [License](#license)

</div>

---

## The Problem

Every time you start a new AI conversation, it knows nothing about your project — the architecture, the patterns, the domain vocabulary. You waste time re-explaining the same context over and over.

Biz App Analyzer scans your codebase once and produces four Markdown documents that capture everything an AI needs: project context, development patterns, module dependencies, and domain glossary. Future AI sessions read these documents and behave like a developer who has spent months on the project.

---

## Installation

Copy the `skills/biz-app-analyzer/` directory into your agent skills folder.

No dependencies. No network calls. No config files outside the project. All output stays in your repo under `.ai-docs/`.

| Concern | Answer |
|---------|--------|
| What does it touch? | Creates `.ai-docs/` directory and `.cursor/rules/ai-docs.mdc` in your project |
| Network calls? | None. All analysis is local static code reading |
| Reversibility | Delete `.ai-docs/` and `.cursor/rules/ai-docs.mdc` to remove completely |

---

## Features

**Full project analysis** — Scans tech stack, architecture mechanisms, development patterns, module dependencies, and domain vocabulary in five phases.

**Incremental updates** — Detects what changed since last run and updates only affected documents, instead of re-analyzing everything.

**Auto-generated Cursor Rule** — Creates a `.cursor/rules/ai-docs.mdc` that tells future AI sessions how and when to consume the knowledge base.

**Framework-agnostic** — Works with frontend apps (Vue, React, Angular), backend services (Node, Python, Go), full-stack apps (Next.js, Nuxt), and mobile apps (React Native, Flutter).

---

## Usage

Tell your AI agent:

```
Analyze this project
```

Or any of these variations:

- "Generate project docs"
- "Help AI understand my project"
- "Project knowledge base"

To update existing documents after code changes:

```
Update project docs
```

---

## Workflow

The analysis runs in five sequential phases. Each phase builds on the previous one.

```
Phase 1: Scanning       → Tech stack, directory layout, environment config
Phase 2: Context        → Request layer, routing, state, auth, shared components
Phase 3: Patterns       → Development "recipes" extracted from sample pages
Phase 4: Module Mapping → Dependency index for every page/module
Phase 5: Glossary       → Domain vocabulary and PRD-to-code term mapping
```

<details>
<summary><b>Phase details</b></summary>

**Phase 1 — Project Scanning.** Locates the dependency manifest, identifies the tech stack with versions, scans the source directory tree (3 levels deep), reads build config for path aliases and proxy rules, and extracts environment variable names.

**Phase 2 — Context Analysis.** Traces five core mechanisms end-to-end: request layer (how HTTP calls are made, authenticated, error-handled), routing & navigation (URL-to-page chain including guards), state management (stores and their consumers), auth & permissions (login flow through in-page access control), and shared capabilities (components, hooks, utilities with collaboration patterns).

**Phase 3 — Pattern Extraction.** Samples 2-3 representative pages from different modules, reads their full source, compares structural similarities, and generalizes into reusable patterns. Each pattern includes trigger conditions, file checklists, standard structure, data flow, and a reference page path.

**Phase 4 — Module Mapping.** Scans every page shallowly to extract its dependency fingerprint — route path, API endpoints, stores, shared components, hooks. Organized by business module for quick lookup.

**Phase 5 — Glossary Generation.** Extracts domain-specific terms from all previous phases: business terms, project-specific technical terms, abbreviations, and PRD-to-code mappings.

</details>

### Update Mode

When documents already exist, an incremental update runs instead of full analysis:

| Tier | Trigger | Action |
|------|---------|--------|
| Tier 1 | Pages added/removed | Auto-update `MODULE_MAP.md` |
| Tier 2 | New components/hooks/stores | Targeted update of `PROJECT_CONTEXT.md` |
| Tier 3 | Architecture changes, new modules, stale >30 days | Recommend full regeneration |

---

## Structure

### Output Documents

Four documents saved to `.ai-docs/` in the project root:

| Document | Purpose |
|----------|---------|
| `PROJECT_CONTEXT.md` | Tech stack, architecture mechanisms, shared components — the core knowledge file (covers 80% of what AI needs) |
| `DEV_PATTERNS.md` | Development recipes: what to create and modify for each type of requirement |
| `MODULE_MAP.md` | Per-page dependency index: routes, APIs, stores, components |
| `GLOSSARY.md` | Domain vocabulary and PRD-to-code term mapping |

### Skill Files

```
skills/biz-app-analyzer/
├── SKILL.md                              # Main skill definition
├── README.md
├── evals/
│   └── evals.json
└── references/
    ├── phase-1-scanning.md               # Detailed Phase 1 instructions
    ├── phase-2-context-analysis.md       # Detailed Phase 2 instructions
    ├── phase-3-pattern-extraction.md     # Detailed Phase 3 instructions
    ├── phase-4-module-mapping.md         # Detailed Phase 4 instructions
    ├── phase-5-glossary.md               # Detailed Phase 5 instructions
    ├── update-mode.md                    # Incremental update procedure
    ├── cursor-rule-template.md           # Auto-generated Cursor Rule template
    └── templates/
        ├── PROJECT_CONTEXT.tpl.md
        ├── DEV_PATTERNS.tpl.md
        ├── MODULE_MAP.tpl.md
        └── GLOSSARY.tpl.md
```

---

## References

- [SKILL.md](./SKILL.md) — Full skill definition with execution flow and quality standards
- [Phase 1: Scanning](./references/phase-1-scanning.md) — Tech stack identification and directory analysis
- [Phase 2: Context Analysis](./references/phase-2-context-analysis.md) — Core mechanism tracing
- [Phase 3: Pattern Extraction](./references/phase-3-pattern-extraction.md) — Development recipe discovery
- [Phase 4: Module Mapping](./references/phase-4-module-mapping.md) — Dependency index building
- [Phase 5: Glossary](./references/phase-5-glossary.md) — Domain vocabulary extraction
- [Update Mode](./references/update-mode.md) — Incremental document refresh
- [Cursor Rule Template](./references/cursor-rule-template.md) — Auto-generated AI guidance rule

---

## Limitations

- Static code reading only — does not execute code or observe runtime behavior
- Chaotic codebases with no consistent patterns produce less useful output
- Domain understanding depends on code naming quality and comments
- For monorepos, run separately on each application's source directory

---

## License

MIT
