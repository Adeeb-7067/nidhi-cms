# CMS Frontend

Vite + React app. Deploy static files to your **app domain** (e.g. `https://app.yourdomain.com`).

## Setup

```powershell
cd frontend
copy .env.example .env
npm install
```

Edit `.env` before **build**:

```env
# Must match your deployed API origin (no trailing slash)
VITE_API_BASE_URL=https://api.yourdomain.com
```

Local dev:

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Static site → `dist/public/` |
| `npm run serve` | Preview production build |
| `npm run typecheck` | TypeScript check |

## Two-domain deployment

1. Set `VITE_API_BASE_URL` to the public API URL.
2. Run `npm run build`.
3. Upload `dist/public/` to your static host or CDN.
4. On the API server, set `ALLOWED_ORIGINS` to this app’s URL.

The dev proxy in `vite.config.ts` is only used when `VITE_API_BASE_URL` is unset (same-origin `/api` during local dev).
