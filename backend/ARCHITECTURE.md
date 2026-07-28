# Backend architecture

Express 5 API with a **layered MVC** layout. Each layer has a single responsibility so new endpoints follow the same pattern.

## Request flow

```
HTTP request
  → app.js (global middleware)
    → routes/index.js (auth gate for protected paths)
    → modules/<domain>/routes/*.routes.js (path + middleware + asyncHandler)
    → modules/<domain>/controllers/*.controller.js (parse input, call services, send JSON)
    → modules/<domain>/services/ (business rules, access checks, side effects)
    → modules/<domain>/schema + models/schema/index.js barrel
    → mappers/ (DB/document → API JSON shape)
```

## Directory layout

```
index.js                # HTTP server entry (backend root)
load-env.js             # dotenv bootstrap
src/
  app.js                # Express app + global middleware
  config/               # Env validation, public API paths
  modules/              # Domain modules — see src/modules/MODULES.md
    admin/ finance/ hrm/ sales/ marketing/
    monitoring/ identity/ work/ collab/ crm/
    inventory/ alerts/ settings/ uploads/ platform/
    access/ jobs/
  routes/index.js       # Auth gate + mounts module routers
  models/schema/index.js # Aggregate Mongoose barrel → modules/*/schema
  mappers/              # Response shaping (*-format.js)
  middlewares/          # Auth, audit, validation, errors
  utils/                # HTTP helpers (errors, pagination) — no I/O
  lib/                  # Infrastructure: DB, JWT, storage, logger, realtime
  views/                # JSON response helpers (no HTML)
  api-zod/generated/    # OpenAPI-derived Zod types (do not edit by hand)
```

## Conventions

### Routes (`routes/*.routes.js`)

- Export a single `Router` as default.
- Use `asyncHandler(controllerFn)` on every async route.
- Apply `requireAuth` / `requireRole` here (not inside controllers).
- Keep one file per OpenAPI tag / product area.

### Controllers (`controllers/*.controller.js`)

- Export named `async function` handlers only.
- Import `Request` / `Response` from `express`.
- Use `utils/route-errors` (`badRequest`, `notFound`, `parseIdParam`, …) instead of manual `res.status().json()` where possible.
- Do not import Mongoose models unless the handler is trivial; prefer `services/` for multi-step logic.
- Large features (e.g. inventory) live under `controllers/<feature>/` with an `index.js` barrel.

### Services (`services/`)

- Business rules, orchestration, background jobs, access coordination.
- May use `lib/` (DB, email, storage) and `models/schema`.
- `services/access/` — who can read/write companies and projects.
- `services/inventory/` — inventory activity, expiry notifications.

### Mappers (`mappers/`)

- Pure functions: document → API JSON (dates as ISO strings, field renaming).
- No database writes.

### Utils (`utils/`)

- Stateless helpers shared by controllers and middleware.
- `route-errors.js` — HTTP errors + pagination parsing.
- `mongo-list.js` — `paginateModel`, `toIso`.

### Lib (`lib/`)

- App-wide infrastructure only (connections, crypto, third-party SDKs).
- Do not put domain rules here.

### Models (`models/schema/`)

- Mongoose schemas and table exports (`usersTable`, …).
- Re-export everything from `models/schema/index.js`.

## Adding a new endpoint

1. Add handler in `controllers/<feature>.controller.js` (or new service if logic is heavy).
2. Register route in `routes/<feature>.routes.js` with `asyncHandler`.
3. If the path must be public, add it to `config/api.js` → `PUBLIC_API_PATHS`.
4. Update `openapi.yaml` and regenerate Zod schemas under `api-zod/generated/api.js` if the contract changes.
5. Run `npm run build` to verify the bundle.

## Auth

- Global gate in `routes/index.js` skips `PUBLIC_API_PATHS` and `OPTIONS`.
- Per-route `requireRole("super_admin")` etc. in feature routers.
- Access helpers: `services/access` (`getCompanyAccess`, `getProjectAccess`, …).

## Errors

Throw from controllers/services using `utils/route-errors` helpers; `middlewares/error-handler.js` maps them (and Zod/Mongo/Multer) to consistent JSON:

```json
{ "error": "Human message", "code": "NOT_FOUND", "field": "email" }
```

## Related docs

- [README.md](./README.md) — setup and scripts
- [DEPLOYMENT.md](./DEPLOYMENT.md) — production hosting
- [openapi.yaml](./openapi.yaml) — HTTP contract
