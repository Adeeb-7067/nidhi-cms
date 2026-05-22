# CMS Backend (API)

**Express 5** + MongoDB API. Deploy this to your **API domain** (e.g. `https://api.yourdomain.com`).

`src/index.js` creates a Node `http.Server` only so **Socket.IO** can share the same port as Express; all HTTP routing is Express (`src/app.js`, `src/routes/*`).

Async route errors are handled with [`express-async-handler`](https://www.npmjs.com/package/express-async-handler) — use it in **route** files only: `router.get("/path", requireAuth, asyncHandler(controllerFn))`.

## MVC layout

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the full guide. Summary:

```
src/
  config/        # Env (PORT, ALLOWED_ORIGINS), public API paths
  routes/        # Per-feature routers — paths, middleware, asyncHandler
  controllers/   # HTTP handlers only (req, res); large domains use subfolders
  services/      # Business logic, access rules, background jobs
  mappers/       # DB documents → API JSON (*-format helpers)
  models/schema/ # Mongoose schemas
  middlewares/   # Auth, audit, validation, global errors
  utils/         # HTTP errors, pagination (no I/O)
  lib/           # Infrastructure (DB, JWT, storage, logger, Socket.IO)
  views/         # JSON response helpers
  api-zod/       # Generated Zod types from OpenAPI
```

Example pairing:

- `controllers/notifications.controller.js` — `export async function getNotifications(req, res) { ... }`
- `routes/notifications.routes.js` — `router.get("/notifications", requireAuth, asyncHandler(getNotifications))`

## Setup

```powershell
cd backend
copy .env.example .env
npm install
```

Edit `.env`:

- `DATABASE_URL` — MongoDB connection string
- `SESSION_SECRET` — long random string
- `ALLOWED_ORIGINS` — comma-separated **frontend** URLs (required for cross-domain browsers + Socket.IO)

Example production:

```env
ALLOWED_ORIGINS=https://app.yourdomain.com
PORT=8080
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with auto-rebuild (port 8080) |
| `npm run build` | Production bundle → `dist/` |
| `npm run start` | Run `dist/index.mjs` (uses `.env`) |
| `npm run seed` | Seed database |

## Two-domain deployment

1. Host this app on the API subdomain.
2. Set `ALLOWED_ORIGINS` to every frontend origin (scheme + host, no trailing slash).
3. Ensure HTTPS and WebSocket proxy for `/socket.io` if behind nginx/Plesk.
4. Point the frontend’s `VITE_API_BASE_URL` at this API’s public URL before building the UI.

OpenAPI spec: [`openapi.yaml`](openapi.yaml)

Production deploy: **[DEPLOYMENT.md](./DEPLOYMENT.md)** (PM2, Plesk, nginx, env, Socket.IO).

## Core dependencies (security-related)

| Package | Role |
|---------|------|
| `express` | HTTP API framework |
| `express-async-handler` | Forwards async errors to the global error handler |
| `helmet` | Security headers |
| `cors` | Cross-origin access (configure `ALLOWED_ORIGINS`) |
| `express-rate-limit` | Brute-force protection on auth routes |
| `zod` | Request validation |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | Access/refresh tokens |
| `mongoose` | MongoDB access |
