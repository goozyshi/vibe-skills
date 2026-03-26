# {Project Name} — Development Patterns

<!-- This document bridges understanding and action. An AI reading a PRD should be able to match the requirement to a pattern here and know exactly what to do. -->

## New Page Checklist

Every new page in this project requires the following steps, regardless of the page type:

<!-- List all side-effects. Adapt this list based on what Phase 3 analysis discovers. -->

1. **Create the page file:** {Where, naming convention}
2. **Register the route:** {Which file, what fields are required}
3. **Add i18n entries:** {Which language files, key naming convention}
4. **Configure permissions:** {If applicable — where and how}
5. **Add menu entry:** {If menu is separate from routes — where and how}
6. {Any other project-specific setup steps}

---

## Pattern A: {Pattern Name}

<!-- Most common pattern first. -->

**When to use:** {PRD keywords or requirement characteristics that signal this pattern. Write in terms of product language, not code language.}

**File structure:**
```
{directory}/{FeatureName}/
├── {main file}
└── {sub-components if applicable}
```

**Standard structure:**

<!-- Describe the page's component composition and data flow in narrative form. Don't write code — describe the architecture. -->

{Description of the page skeleton — what components form the layout, how they're connected, what drives data fetching, how user actions flow through the system.}

**Data flow:**

1. {Page mount → initial data loading}
2. {User interaction → data fetch/mutation}
3. {Submit/save → API call → refresh}

**Reference page:** `{exact file path of a real page that exemplifies this pattern}`

---

## Pattern B: {Pattern Name}

**When to use:** {trigger conditions}

**File structure:**
```
{…}
```

**Standard structure:**

{…}

**Data flow:**

1. {…}

**Reference page:** `{path}`

---

<!-- Repeat for each identified pattern. Typical projects have 3-5 patterns. -->

## Variations & Edge Cases

<!-- Note any common deviations from the patterns above. -->

- {Variation description, e.g., "Some CRUD pages use a drawer instead of a dialog for editing large forms"}
- {…}
