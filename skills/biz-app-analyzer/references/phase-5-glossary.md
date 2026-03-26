# Phase 5: Glossary Generation

The goal of this phase is to extract and define the vocabulary that is specific to this project. Without this glossary, an AI encountering the term "guild" in a route path has no way to know it means "a group of livestream hosts organized under a manager" rather than its common English meaning.

## What Belongs in the Glossary

Include terms that meet **at least one** of these criteria:

1. **Business domain terms** that a newcomer would not understand. These come from the industry or product domain — terms like "anchor" (meaning livestream host), "deco" (meaning virtual decoration), "settlement" (meaning payment processing for hosts).

2. **Project-specific technical terms** that differ from their common meaning or are unique to this codebase. Examples: a function named `pruneVnode` that controls UI permission filtering, a parameter called `readParam` that drives auto-fetching in CustomTable, an API prefix like `proxy/maidocha_svr/` that routes through a backend gateway.

3. **Abbreviations and acronyms** used in the codebase. `bizId`, `oid`, `opTypes` — these are meaningless without expansion.

4. **PRD-to-code mappings** where the product team uses different vocabulary than the code. If PRDs say "streamer" but the code says "anchor", both terms need to be in the glossary with a cross-reference.

## What Does NOT Belong

Exclude terms that are:

- **General programming concepts**: "component", "store", "router", "hook" — unless the project uses these words with a non-standard meaning
- **Framework-standard vocabulary**: "defineProps", "reactive", "middleware" — unless the project has a custom implementation that changes expected behavior
- **Self-explanatory names**: `userList`, `isLoading`, `handleSubmit` — these don't need definitions

## Where to Find Terms

Draw from all previous phases:

- **Phase 1**: Directory names, dependency names, environment variable names
- **Phase 2**: Store names and their data fields, API path segments, component names, permission-related terms
- **Phase 3**: Pattern names, business module names discovered during page sampling
- **Phase 4**: Route path segments, API endpoint segments, business module descriptions

Also scan for:
- **Enum files**: These often contain domain vocabulary (status names, type names, category names)
- **Constant files**: Named constants often encode domain concepts
- **i18n files**: Translation keys and values reveal how the product talks about its features

## Structure

Organize the glossary into two sections:

### Business Terms

These are terms from the product/business domain. For each term:
- The term as it appears in code (e.g., `guild`)
- Its meaning in the product context (e.g., "An organization of livestream hosts managed by a guild leader")
- Alternative names if the PRD or users call it differently (e.g., "Also called 'agency' in some PRDs")

### Technical Terms

These are codebase-specific technical terms. For each term:
- The term (e.g., `readParam`)
- What it means/does (e.g., "The reactive parameter object that drives CustomTable's auto-fetch behavior. When any field in readParam changes, CustomTable re-fetches data from readURL.")
- Where it's used (e.g., "Seen in every CRUD list page")

## Quality Check

A good glossary passes this test: take any term from it, imagine an AI encountering that term in the codebase for the first time, and ask — would the definition give enough context to use it correctly? If not, the definition needs more specificity.

## Phase 5 Output

Fill in the `GLOSSARY.md` template with the two sections above. Aim for 15-40 terms for a typical project — enough to cover the non-obvious vocabulary without becoming an exhaustive dictionary.
