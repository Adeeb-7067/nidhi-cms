# How to Run CMS Locally

Frontend and backend are **separate npm projects** so you can deploy them on different domains.

| App | Folder | Port |
|-----|--------|------|
| API | [`backend/`](backend/) | 8080 |
| UI | [`frontend/`](frontend/) | 5173 |

## 1. Install dependencies

```powershell
cd backend
npm install

cd ..\frontend
npm install
```

## 2. Environment files

### Backend — `backend/.env`

Copy `backend/.env.example` → `backend/.env`:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/nexus_cms
SESSION_SECRET=your-random-jwt-secret-key
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

`ALLOWED_ORIGINS` must list your **frontend** URL(s). Required when UI and API are on different hosts (local or production).

Optional: Firebase admin, object storage — see `backend/.env.example`.

### Frontend — `frontend/.env`

Copy `frontend/.env.example` → `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_NAME=CMS
VITE_APP_SHORT_NAME=CMS
VITE_APP_LOGO=/logo.png
```

For production builds on another domain:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

Restart Vite after changing frontend env vars.

## 3. Seed the database

```powershell
cd backend
npm run seed
# optional: npm run seed-more
```

## 4. Start dev servers

**Terminal A — API**

```powershell
cd backend
npm run dev
```

**Terminal B — UI**

```powershell
cd frontend
npm run dev
```

Open **http://localhost:5173**. With `VITE_API_BASE_URL` set, API calls go to **http://localhost:8080**.

## 5. Production build

```powershell
cd backend
npm run build
npm run start

cd ..\frontend
npm run build
```

- API output: `backend/dist/index.mjs`
- UI static files: `frontend/dist/public/`

## Two-domain deployment checklist

1. Deploy **backend** → `api.yourdomain.com`, set `ALLOWED_ORIGINS=https://app.yourdomain.com`.
2. Set `VITE_API_BASE_URL=https://api.yourdomain.com` in `frontend/.env`, then `npm run build`.
3. Deploy **frontend** static files → `app.yourdomain.com`.
4. Proxy WebSockets: `/socket.io` → API server.

See [DEPLOYMENT_PLESK.md](DEPLOYMENT_PLESK.md) and per-app READMEs.

## Seed credentials

| Role | Email | Employee ID | Password |
|------|-------|-------------|----------|
| **Super Admin** | admin@agency.com | — | `Admin@123` |
| **Developer (Alice)** | alice@agency.com | `AL001` | `Dev@123` |
| **Developer (Bob)** | bob@agency.com | `BO002` | `Dev@123` |
| **Tester (David)** | david@agency.com | — | `Dev@123` |
| **Client** | client@example.com | — | `Client@123` |
