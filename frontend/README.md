# CMS Frontend

Vite + React app. Deploy static files to your **app domain** (e.g. `https://app.yourdomain.com`).

## Setup

```powershell
cd frontend
copy .env.example .env
npm install
```

Edit `.env` for branding / Firebase. For **local web dev**, leave `VITE_API_BASE_URL` **unset** so the Vite proxy serves same-origin `/api` (no CORS OPTIONS). Use `frontend/.env.local` to force an empty override if `.env` still has a value.

```env
# Local web: leave unset (Vite proxies /api → backend)
# VITE_API_BASE_URL=

# Split domains or Electron build only:
# VITE_API_BASE_URL=https://api.yourdomain.com
```

Local Electron / split-origin still needs an absolute API URL at build time.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Static site → `dist/public/` |
| `npm run serve` | Preview production build |
| `npm run typecheck` | TypeScript check |

## Two-domain deployment

1. Prefer same-origin: reverse-proxy `/api` to Node and leave `VITE_API_BASE_URL` unset in the web build.
2. If API is on a separate host, set `VITE_API_BASE_URL` to that origin, then `npm run build`.
3. Upload `dist/public/` to your static host or CDN.
4. On the API server, set `ALLOWED_ORIGINS` to this app’s URL.

The dev proxy in `vite.config.ts` is used when `VITE_API_BASE_URL` is unset (same-origin `/api` during local web).

## API performance (local)

- Prefer unset `VITE_API_BASE_URL` so the browser does not pay CORS OPTIONS on every call.
- Shell must not mount ungated sales/finance list hooks for all roles (`SalesAlerts` is permission-gated).
- Page KPIs should use `/summary` (or `/nav/badges`), not repeated `limit: 1` list queries.
