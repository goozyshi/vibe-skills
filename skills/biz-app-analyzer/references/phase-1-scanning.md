# Phase 1: Project Scanning

The goal of this phase is to build a technical profile of the project — what it's built with, how files are organized, and what environments it targets. This profile guides every subsequent phase.

## Step 1: Locate the Project Root

Find the dependency manifest file. This is the anchor that identifies the project root:

- **JavaScript/TypeScript**: `package.json`
- **Python**: `pyproject.toml`, `requirements.txt`, or `setup.py`
- **Go**: `go.mod`
- **Rust**: `Cargo.toml`
- **Java**: `pom.xml` or `build.gradle`
- **Ruby**: `Gemfile`
- **PHP**: `composer.json`

If the user provided a path to a subdirectory, walk up until you find the manifest. If the project is a monorepo (multiple manifest files at different levels), ask the user which application to analyze, or analyze the one at the path they specified.

## Step 2: Identify the Tech Stack

Read the dependency manifest and extract:

**Core framework and version.** Not just "Vue" but "Vue 3.5.13". Not just "React" but "React 18.2 with Next.js 14". The version matters because APIs and patterns differ significantly across major versions.

**UI library.** Element Plus, Ant Design, Vant, Material UI, Chakra, Tailwind — this determines what component vocabulary the project speaks.

**State management.** Pinia, Vuex, Redux, Zustand, MobX, Jotai — or none (prop drilling / context only).

**Build tool.** Vite, Webpack, Rollup, esbuild, Turbopack — and its version.

**Language.** TypeScript (check for tsconfig.json and its strict mode setting) or JavaScript. Check for type-checking strictness.

**Other significant dependencies.** Internationalization (vue-i18n, react-intl), HTTP clients (axios, ky, ofetch), charting (echarts, chart.js), rich text editors, file upload, monitoring (Sentry), etc. Focus on dependencies that shape how code is written, not utility libraries like lodash.

## Step 3: Scan the Source Directory

Generate a directory tree of the source root (typically `src/` or `app/`), 3 levels deep. For each top-level directory, note what kind of files it contains based on naming patterns:

- Directories like `views/`, `pages/`, `screens/` → page components
- Directories like `components/`, `ui/` → shared/reusable components
- Directories like `hooks/`, `composables/`, `lib/` → shared logic
- Directories like `store/`, `stores/`, `state/` → state management
- Directories like `api/`, `services/`, `requests/` → API layer
- Directories like `router/`, `routes/` → routing configuration
- Directories like `utils/`, `helpers/`, `common/` → utility functions
- Directories like `types/`, `interfaces/`, `models/` → type definitions
- Directories like `assets/`, `static/`, `public/` → static resources
- Directories like `locale/`, `i18n/`, `lang/` → internationalization
- Directories like `middleware/`, `guards/`, `permission/` → access control
- Directories like `plugins/`, `directives/` → framework extensions
- Directories like `config/`, `constants/`, `enums/` → configuration and constants

Not every project will have all of these. Record what's actually there.

## Step 4: Read Build Configuration

Read the build configuration file (vite.config.ts, webpack.config.js, next.config.js, etc.) and extract information that affects development:

- **Path aliases**: `@/` → `src/`, `@components/` → `src/components/`, etc. These are essential for understanding import paths throughout the codebase.
- **Dev server proxy rules**: These reveal how the frontend connects to backend services during development. Proxy paths like `/api` → `https://backend.example.com` indicate the real API structure.
- **Environment-specific behavior**: Different build targets (development, staging, production) and how they're configured.
- **Plugin configuration**: Auto-import plugins, component resolvers, and other build-time transforms that affect how code is written.

## Step 5: Extract Environment Variables

Read `.env`, `.env.development`, `.env.production`, and similar files. Extract **variable names only**, never values. Group them by purpose:

- API endpoints (e.g., `VITE_API_BASE_URL`, `NEXT_PUBLIC_API_URL`)
- Feature flags (e.g., `VITE_ENABLE_ANALYTICS`)
- Third-party service keys (e.g., `VITE_SENTRY_DSN` — note the name, not the value)

This reveals what external services the project depends on and how environments differ.

## Step 6: Check for Existing Documentation

Quickly check if the project already has useful documentation:

- `README.md` — read it; it may contain setup instructions, architecture notes, or business context
- `docs/` directory — note what's there
- `.cursor/rules/` — the project may already have AI rules that inform the analysis
- `CHANGELOG.md` — recent entries reveal what's actively being developed
- `CONTRIBUTING.md` — may describe conventions

Don't spend too long on this. Just note what exists so later phases can leverage it.

## Phase 1 Output

By the end of this phase, you should be able to fill in these sections of `PROJECT_CONTEXT.md`:

- **Project overview**: What the product is, based on README + dependency analysis + directory structure clues
- **Tech stack table**: Framework, UI library, state management, build tool, language — all with versions
- **Directory structure**: The tree with per-directory role annotations
- **Environment configuration**: Variable names grouped by purpose, proxy rules

You should also have a clear mental map of where to look in subsequent phases:
- Where are the route definitions?
- Where is the HTTP request wrapper?
- Where are the stores?
- Where are the shared components?
- Where are the page components organized?

Carry these answers forward — Phase 2 will dive deep into each of these locations.
