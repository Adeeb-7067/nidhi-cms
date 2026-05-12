# Nexus CMS

A multi-role enterprise Client Management System for software agencies. Manages projects, bugs, APK releases, daily work logs, client portals, analytics, reports, and team collaboration across 5 roles.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/cms-app run dev` — run the frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + TailwindCSS + shadcn/ui, dark-mode-first

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit manually)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit manually)
- `lib/db/src/schema/` — Drizzle ORM schemas (12 files: users, clients, projects, logs, bugs, apk, comments, notifications, requests, reports, settings, audit)
- `artifacts/api-server/src/routes/` — all Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — requireAuth, requireRole middleware
- `artifacts/cms-app/src/pages/` — frontend pages organized by role (admin/, dev/, client/)
- `artifacts/cms-app/src/contexts/AuthContext.tsx` — JWT auth state

## Architecture decisions

- Custom JWT auth (not Clerk/OAuth) — required because the PRD mandates Employee ID login for internal staff
- Employee ID format: 2 uppercase letters from first name + 3-digit counter (e.g. AL001), tracked in `employee_counter` table
- Contract-first API: OpenAPI spec → Orval codegen → React Query hooks used everywhere; never write fetch calls by hand
- Role-based routing: after login, users are redirected by role (`super_admin` → `/admin`, `developer` → `/dev`, `client` → `/client`)
- API runs on port 8080, frontend on its own port; both routed via the shared reverse proxy (no CORS config needed)

## Product

**Roles:** Super Admin, Developer, Client, Tester/QA, Project Manager

**Admin portal:** command-center dashboard with KPIs and charts, project management (CRUD + milestones), employee management, client management, analytics, resource requests

**Dev workspace:** personal project dashboard, daily log submission, bug tracker, APK upload, report generation

**Client portal:** project status overview, project analytics, APK/release downloads

## Seed credentials

| Role | Email | Employee ID | Password |
|------|-------|-------------|----------|
| Super Admin | admin@agency.com | — | Admin@123 |
| Developer (Alice) | alice@agency.com | AL001 | Dev@123 |
| Developer (Bob) | bob@agency.com | BO002 | Dev@123 |
| Client | client@example.com | — | Client@123 |

## User preferences

- Dark-mode-first UI, Linear/Vercel/Jira aesthetic
- Premium, enterprise-grade design — no toy UI
- All API interactions go through generated hooks, never raw fetch

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after editing schema files
- `req.params['id'] as string` cast required in all Express 5 route files (params type is `string | string[]`)
- `useGetMe` (and other hooks) requires explicit `queryKey` in the query options object
- `ReportStatus` enum: `queued | generating | ready | failed` — not `completed`
- `BugListResult` and `LogListResult` are paginated wrappers — access `.bugs` and `.logs` properties respectively
- Do not use deep import paths like `@workspace/api-client-react/src/custom-fetch` — use the barrel `@workspace/api-client-react`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
