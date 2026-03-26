# Phase 3: Pattern Extraction

The goal of this phase is to discover the "recipes" that developers follow when building features in this project. These patterns are what make the difference between an AI that understands the project and an AI that can actually build things in it.

## Strategy: Sample, Compare, Generalize

Don't try to read every page. Instead:

1. **Sample broadly.** Pick 2-3 pages from different business modules. Choose pages that look like they represent common feature types — a list/table page, a form/detail page, a dashboard/stats page.

2. **Read each sample page fully.** Read the complete source — template, script, and style. Note everything: what it imports, how it structures data, how it fetches data, how it handles user interactions, what components it uses.

3. **Compare across samples.** Look for structural similarities. Do multiple pages use the same component arrangement? The same data-fetching pattern? The same form-submit flow? These similarities are your patterns.

4. **Generalize.** Abstract the pattern from the concrete examples. A pattern is not "GiftManage.vue uses CustomTable with readURL" — it's "CRUD list pages use CustomTable with a readURL pointing to the list API, driven by a readParam object that CustomSearchBar updates on search."

## What Makes a Good Pattern

A pattern should contain everything an AI needs to replicate it from scratch given a new requirement. Specifically:

### Trigger Condition

When should this pattern be used? Express this in terms of **PRD language**, not code language. Think about what words in a requirement document would signal this pattern:

- "manage", "list", "add/edit/delete" → CRUD management page
- "view details", "review", "approve" → Detail/review page
- "statistics", "dashboard", "chart" → Data visualization page
- "configure", "settings", "toggle" → Configuration page
- "upload", "import", "batch" → Batch operation page

### File Checklist

What files need to be created or modified? Be exhaustive — this is where AI implementations typically miss steps:

**Files to create:**
- The page component itself (where, naming convention)
- Sub-components if the page is complex (where, when to split)
- Page-specific API file if needed (when vs using the shared request layer directly)

**Files to modify:**
- Route registration (which file, what format)
- Navigation/menu configuration (if separate from routes)
- Internationalization entries (which files, what keys)
- Permission configuration (if permission entries need manual registration)

### Standard Structure

What does the page component look like structurally? Describe in terms of the project's own vocabulary — which shared components form the skeleton, how they're arranged, and how data flows between them.

Don't write actual code. Describe the structure:

> The page has three sections: a CustomSearchBar at the top configured with searchContent array, a CustomTable in the middle bound to readURL and readParam, and a CustomDialog for add/edit triggered by toolbar buttons. When SearchBar emits @update, the handler merges search values into readParam and resets pagination to page 1. CustomTable watches readParam and auto-fetches. Dialog submission calls axiosPostConfig, then refreshes the table by touching readParam.

### Data Flow

Trace the data lifecycle for the page's primary operation:

- Where does configuration data come from? (enums, constants, API)
- How is list data fetched? (which API, what triggers it, how is it paginated)
- How is item data submitted? (which API, what format, what happens after)
- How are errors handled? (validation, API errors, user feedback)

### Reference Page

Name the actual file path of an existing page that best exemplifies this pattern. This is crucial — when the AI implements a new page, it can read this reference to see every concrete detail that the pattern description might miss.

## Discovering Patterns: What to Look For

When reading sample pages, pay attention to:

**Template structure.** Do pages share a similar component arrangement? A search bar + table + dialog is one pattern. A tab bar + conditional content is another. A form with save/cancel buttons is another.

**Data initialization.** How does the page set up its data on mount? Does it fetch enums? Load a list? Check permissions?

**User interaction flows.** Search → fetch → display. Click add → open dialog → fill form → submit → refresh. Click row → navigate to detail. These interaction flows tend to repeat.

**Component usage patterns.** Which shared components appear together frequently? If CustomTable and CustomSearchBar always appear as a pair, that's a pattern element.

**API call patterns.** Are APIs called directly in the page, through a composable, or through a centralized function? Is there a consistent error handling approach?

## Side-Effect Checklist

Beyond the page itself, document the "new page setup tax" — everything a developer must do beyond writing the component:

1. **Route registration.** Where to add the route, what fields are required (path, component, meta).
2. **Menu/sidebar entry.** Is it automatic from routes, or does it need a separate configuration?
3. **Internationalization.** What language files need new entries? What's the key naming convention?
4. **Permission setup.** Does the new page need permission entries in a backend system or configuration file?
5. **Navigation.** Does any existing page need to link to this new page?

## Handling Variation

Not every page will fit neatly into a pattern. That's fine. Your output should:

- Cover the most common patterns (the ones that account for 70-80% of pages)
- Note known variations on each pattern (e.g., "some CRUD pages use a drawer instead of a dialog for editing")
- Acknowledge that unusual pages exist without forcing them into a pattern

## Phase 3 Output

Fill in the `DEV_PATTERNS.md` template with:

- A "New Page Checklist" section listing the universal side-effects for any new page
- Pattern sections ordered by frequency (most common first)
- Each pattern containing: trigger condition, file checklist, standard structure, data flow, and reference page path
