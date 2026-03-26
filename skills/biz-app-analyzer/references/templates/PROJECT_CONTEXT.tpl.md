# {Project Name} — Project Context

<!-- This is the core knowledge document. An AI reading only this file should understand 80% of what it needs to work effectively in this project. -->

## Project Overview

<!-- What the product does, who uses it, and why it exists. Write for someone who has never seen this codebase. -->

**Product:** {One-sentence description of what the product is}

**Users:** {Who uses this application — internal team? End users? Admins?}

**Business domain:** {What industry/domain — e-commerce, social platform, fintech, SaaS, etc.}

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | {e.g., Vue} | {e.g., 3.5.13} |
| Language | {e.g., TypeScript} | {e.g., 5.7} |
| Build tool | {e.g., Vite} | {e.g., 6.x} |
| UI library | {e.g., Element Plus} | {e.g., 2.8} |
| State management | {e.g., Pinia} | |
| Router | {e.g., Vue Router, hash mode} | |
| HTTP client | {e.g., Axios} | |
| i18n | {e.g., vue-i18n} | |
| Other notable | {e.g., Sentry, echarts, etc.} | |

## Environment Configuration

| Variable | Purpose |
|----------|---------|
| {VITE_API_BASE_URL} | {Main API endpoint} |
| {…} | {…} |

**Dev proxy rules:**
<!-- List dev server proxy paths and their targets -->

## Directory Structure

```
src/
├── {directory}/     # {role description}
├── {directory}/     # {role description}
└── ...
```

<!-- Annotate every top-level source directory with its role. -->

**Path aliases:**
- `{@/}` → `{src/}`
- {…}

## Request Mechanisms

<!-- Describe each HTTP request pattern as a flow. Include: base URL strategy, auth injection, success/error handling, when to use this pattern. -->

### {Pattern Name, e.g., "Main Business API"}

{Narrative flow description — see Phase 2 instructions for the level of detail expected.}

### {Pattern Name, e.g., "Activity API"}

{If there are multiple request patterns, describe each one.}

## Routing & Navigation

**Mode:** {hash / history}

**Layout structure:** {Describe the page shell — header, sidebar, content area, tabs, etc.}

**Route organization:** {How routes are split — one file per module, etc.}

**Navigation guard flow:**
<!-- Describe the guard chain: what checks happen before a page renders -->

1. {First check, e.g., "White-listed routes bypass all checks"}
2. {Second check, e.g., "Fetch user info if not loaded"}
3. {Third check, e.g., "Verify route is in user's permitted menu list"}
4. {Fallback, e.g., "Redirect to 404 if not permitted"}

## State Management

<!-- For each store, describe its responsibility, key data, core methods, and how pages consume it. -->

### {Store Name}

**Responsibility:** {What domain this store owns}

**Key state:**
- `{field}`: {type and purpose}
- {…}

**Core methods:**
- `{method}()`: {what it does}
- {…}

**Used by:** {Which modules/pages depend on this store}

<!-- Repeat for each store -->

## Auth & Permissions

**Authentication:** {How users prove identity — token type, storage location, refresh mechanism}

**Route-level control:** {How the system decides if a user can access a page}

**In-page control:** {How the system controls actions within a page — button visibility, tab filtering, etc.}

**Permission data source:** {Where permission data comes from and its structure}

## Shared Components

<!-- For each significant shared component, document its purpose, key interface, collaboration pattern, and gotchas. -->

### {ComponentName}

**Purpose:** {When to use this component}

**Key Props:**
- `{prop}` ({type}): {what it controls}
- {…}

**Key Events:**
- `{event}`: {when it fires, what payload}
- {…}

**Collaboration:** {How this component works with other components, hooks, or APIs}

<!-- Repeat for each shared component -->

## Hooks / Composables

<!-- For each shared hook, document what problem it solves, its interface, and typical usage. -->

### {hookName}

**Solves:** {What repetitive problem this hook eliminates}

**Parameters:** {Key parameters and types}

**Returns:** {Key return values and types}

**Typical usage:** {One-sentence description of how pages use it}

<!-- Repeat for each hook -->

## Utility Functions

<!-- Brief listing of key utility modules and their most-used functions. Only detail functions that are widely used or have non-obvious behavior. -->

### {utils/fileName}

- `{functionName}()`: {what it does}
- {…}
