# Backend modules

Domain-first layout for the modular monolith. **Mechanical moves only** — HTTP paths, JSON shapes, and DB schemas must not change in move PRs.

## Rules

1. New feature code goes under `src/modules/<domain>/`.
2. Each module may contain: `routes/`, `controllers/`, `services/`, `schema/`, optional `mappers/`, and `index.js` public barrel.
3. Cross-module imports should prefer the module path (or public barrel); do not reintroduce flat `controllers/` / `services/` trees.
4. Infra (`lib/`, `utils/`, `middlewares/`, `mappers/`) stays shared until a later `shared/` phase.
5. `models/schema/index.js` remains the aggregate schema barrel (re-exports from modules).

## Domains

| Module | Status | Contents |
|--------|--------|----------|
| `admin` | migrated | admin media, project documents |
| `finance` | migrated | finance controllers/services/schema/routes |
| `hrm` | migrated | HRM controller/services/schema/routes |
| `sales` | migrated | sales controllers/services/schema/routes |
| `marketing` | migrated | digital/marketing controllers/services/schema/routes |
| `monitoring` | migrated | screenshots, presence, work sessions, consent |
| `identity` | migrated | auth, users, permissions, client team, user schema |
| `work` | migrated | tasks, bugs, logs, apk, requests, reports, tickets, warnings |
| `collab` | migrated | comments, notifications, direct conversations |
| `crm` | migrated | clients, companies, projects, search, analytics |
| `inventory` | migrated | inventory controllers/services/schema/routes |
| `alerts` | migrated | alerts + deliveries + scheduler |
| `settings` | migrated | company settings API + settings schema |
| `uploads` | migrated | file upload endpoints |
| `platform` | migrated | health, workspace dashboard, activity feed, audit/counter schemas |
| `access` | migrated | company/project access and row-level scopes |
| `jobs` | migrated | recurring-job locks and job-run schema |

Legacy flat `controllers/`, `services/`, and per-feature `routes/*.routes.js` shims have been **removed**. Wire new routes through `src/routes/index.js` → `src/modules/<domain>/…`.
