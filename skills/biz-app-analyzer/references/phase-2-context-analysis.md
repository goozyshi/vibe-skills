# Phase 2: Context Analysis

The goal of this phase is to understand how the project actually works — not what files exist, but how data flows, how users are authenticated, how pages get rendered, and how shared code is meant to be used. This is the most important phase because it produces the core knowledge document.

Read the relevant files identified in Phase 1. For each mechanism below, trace the flow end-to-end rather than describing files in isolation.

## Mechanism A: Request Layer

Find the HTTP client setup — typically an axios instance, fetch wrapper, or framework-specific data fetching utility. There may be more than one.

**What to extract for each request pattern:**

1. **Base URL strategy.** Is it hardcoded, from environment variables, or determined by proxy rules? Does it differ per API domain?
2. **Authentication injection.** How are auth tokens attached? Headers? Cookies? Where does the token come from (localStorage, cookie, store)?
3. **Request lifecycle.** What happens before a request (interceptors, middleware)? What happens on success (data extraction — is it `response.data`, `response.data.content`, something else)? What happens on error (status code handling, redirects, user-facing messages)?
4. **Loading state.** Is there a global loading indicator? How do individual pages manage loading states?
5. **Multiple instances.** If the project has multiple request configurations (e.g., one for the main API, another for a third-party service), document each one and explain when each is used.

**Output format:** Describe each request pattern as a narrative flow, not a file description. Example of the level of detail needed:

> Business API requests go through `share/proxy.js`. The `axiosPostConfig(url, params)` function prepends `proxy/maidocha_svr/` to the URL, adds `Authtoken`, `oid`, and `lang` headers from cookies, shows a global loading spinner (unless `__NO_LOADING__` is set), and checks if the response code starts with "20" for success. On 401/403, the user is redirected to `/logout`. Success data is extracted from `response.content` or `response.data`.

## Mechanism B: Routing & Navigation

Find the router configuration — the entry file and any module/route definition files.

**What to extract:**

1. **Router mode.** Hash or history mode? This affects URL structure and deployment.
2. **Route organization.** Are routes in one file or split by module? What's the grouping logic?
3. **Layout structure.** Is there a shared layout component that wraps page content? What does it include (header, sidebar, breadcrumbs, tabs)?
4. **Navigation guards.** What checks happen before a route loads? Authentication verification? Permission checking? Data prefetching?
5. **Lazy loading.** Are page components loaded lazily? What's the import pattern?
6. **Route metadata.** What custom metadata is attached to routes (titles, permissions, icons)?
7. **The full page render chain.** Trace what happens from URL entry to visible page: URL → router match → guard execution → layout rendering → page component mounting. This chain is critical for understanding where to intervene when adding new pages.

## Mechanism C: State Management

Find the store directory and read each store file.

**What to extract for each store:**

1. **Responsibility.** What domain does this store own? User data? UI state? Business entity cache?
2. **Data structure.** What are the key state fields and their types? Don't list every field — focus on the ones that other parts of the codebase depend on.
3. **Core methods.** What are the main actions/getters? How do they interact with the API layer?
4. **Caching strategy.** Does the store cache data? How is freshness managed? Is there a TTL or manual invalidation?
5. **Consumption pattern.** How do pages typically access this store? Direct import? Injection? A composable/hook wrapper?

Also note **cross-store dependencies** — if one store reads from or triggers another, that relationship matters.

## Mechanism D: Auth & Permissions

Find the authentication and permission logic. This often spans multiple files — the login flow, route guards, permission utilities, and the user/auth store.

**What to extract:**

1. **Authentication flow.** How does a user prove their identity? Token-based? Session? OAuth? Where is the credential stored client-side?
2. **Session lifecycle.** When is auth state checked? On every navigation? On app init? How is session expiry handled?
3. **Route-level access control.** How does the system decide whether a user can access a given route? Is it role-based, permission-list-based, or menu-tree-based?
4. **In-page access control.** Beyond "can you see this page", how does the system control what a user can do within a page? Button visibility? Tab filtering? Field editability?
5. **Permission data source.** Where does permission information come from? An API call on login? A field in the user object? A separate permission service?

Document this as a flow: user opens app → auth check → permission tree constructed → routes filtered → page-level controls applied.

## Mechanism E: Shared Capabilities

Analyze the shared components, hooks/composables, and utility functions directories.

**For shared components,** don't just list Props. For each significant component, document:

1. **Purpose and when to use it.** Under what circumstances should a developer reach for this component instead of building from scratch?
2. **Key interface.** The most important Props and Events — not all of them, just the ones that define how the component behaves.
3. **Collaboration pattern.** How does this component work with other parts of the system? Does CustomTable auto-fetch data when readParam changes? Does a Dialog component pair with a specific hook?
4. **Gotchas.** Anything non-obvious about its behavior — auto-refresh triggers, special parameter names, data format expectations.

**For hooks/composables,** document:

1. **What problem it solves.** Why does this hook exist? What repetitive code does it eliminate?
2. **Parameters and return values.** Types and purpose.
3. **Typical usage.** A one-sentence description of how it's used in pages.

**For utilities,** briefly note the key functions and what they do. Only detail functions that are widely used or have non-obvious behavior.

## Bringing It Together

After analyzing all five mechanisms, the information should interconnect naturally. A page render involves routing (B) which triggers auth checks (D) which reads from the user store (C). The page then uses shared components (E) that call APIs through the request layer (A) which also populates stores (C).

When writing PROJECT_CONTEXT.md, let these connections show. If a shared component internally uses a specific API pattern, mention it in the component's documentation. If the auth mechanism stores data in a specific store, cross-reference it.

## Phase 2 Output

Fill in the `PROJECT_CONTEXT.md` template with:

- Project overview (from Phase 1, enriched with business context discovered during file reading)
- Directory structure with role annotations (from Phase 1)
- Request mechanism section (Mechanism A)
- Routing & navigation section (Mechanism B)
- State management section (Mechanism C)
- Auth & permissions section (Mechanism D)
- Shared components section (Mechanism E — components)
- Hooks / composables section (Mechanism E — hooks)
- Utility functions section (Mechanism E — utils)
