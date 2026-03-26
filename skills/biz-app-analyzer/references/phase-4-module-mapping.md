# Phase 4: Module Mapping

The goal of this phase is to build a lookup index — when an AI needs to work on a specific page or module, it can check this index to immediately see what routes, APIs, stores, and components are involved.

## Strategy: Breadth Over Depth

Unlike Phase 3 which reads a few pages deeply, this phase scans many pages shallowly. For each page, you only need to extract its dependency fingerprint — not understand its business logic.

## How to Scan Efficiently

For each page file in the views/pages directory:

1. **Read the `<script>` or `<script setup>` section only.** Skip the template and style — they don't contain dependency information that isn't already visible in the script.

2. **Read import statements.** These reveal component, store, hook, and utility dependencies.

3. **Scan for API calls.** Look for HTTP function invocations (axios calls, fetch calls, project-specific request helpers). Extract the URL/endpoint being called.

4. **Check the route configuration.** Cross-reference with the route files from Phase 2 to find this page's route path.

5. **Note any page-specific sub-components.** If the page directory contains additional `.vue`/`.tsx` files beyond the main page, note them as "local components" — they indicate the page is complex enough to warrant splitting.

## What to Record Per Page

For each page, capture:

- **Route path:** The URL path this page responds to
- **APIs:** The endpoint URLs or function calls the page makes
- **Stores:** Which stores the page imports and uses
- **Shared components:** Which project-level shared components are imported
- **Local components:** Any sub-components defined alongside this page
- **Hooks/composables:** Which shared hooks the page uses

Keep the format compact. This is a reference index, not documentation.

## Grouping

Organize pages by **business module** — the top-level directory within views/pages. Each module gets its own section. Within a module, list pages in a logical order (typically matching the route/menu order, or alphabetically if no clear order exists).

For each module, add a one-line summary of what business domain it covers, drawn from your Phase 2 and Phase 3 analysis.

## Handling Scale

For small projects (under 30 pages), map every page.

For medium projects (30-80 pages), map every page but allow brief entries for simple pages (just route + API + key components).

For large projects (80+ pages), map all modules but within each module, focus on the 3-5 most important pages. Add a note like "This module contains 12 additional pages following the standard CRUD pattern" to cover the rest.

## Cross-Referencing

This document becomes significantly more useful when it connects to the other documents:

- When a page follows a pattern from `DEV_PATTERNS.md`, note it: "Follows Pattern A: CRUD Management"
- When a page uses a shared component in a non-obvious way, reference the component's documentation in `PROJECT_CONTEXT.md`
- When a page involves domain terms, use the terms defined in `GLOSSARY.md`

## Phase 4 Output

Fill in the `MODULE_MAP.md` template with:

- One section per business module
- Each section has a one-line module description
- Each page within the module has its dependency fingerprint (route, APIs, stores, components, hooks)
- Pattern references where applicable
