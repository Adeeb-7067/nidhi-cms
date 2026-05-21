# CMS Backend — Deployment Guide

Deploy the **Express API** (`cms-backend`) to your API host, e.g. `https://api.cms.satyakabir.com`.

The React UI is a **separate** app in `../frontend/`. For full-stack Plesk steps (UI + API on one server), see [DEPLOYMENT_PLESK.md](../DEPLOYMENT_PLESK.md).

---

## What gets deployed

| Item | Path / command |
|------|----------------|
| Source | `backend/src/` (TypeScript) |
| Production bundle | `backend/dist/index.mjs` (after `npm run build`) |
| Entry command | `node --env-file=.env --enable-source-maps ./dist/index.mjs` |
| Health check | `GET /api/healthz` → `{"status":"ok"}` |
| WebSockets | Socket.IO on `/socket.io` (same port as HTTP) |

**Runtime:** Node.js **20+** (uses `--env-file`). Do **not** use Bun unless you install and configure it yourself — this project targets **Node + npm**.

---

## Server requirements

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 20.x or 22.x LTS |
| **npm** | For `npm install` and `npm run build` on the server (or build locally and upload `dist/`) |
| **MongoDB** | [MongoDB Atlas](https://www.mongodb.com/atlas) or self-hosted; connection string in `DATABASE_URL` |
| **HTTPS** | Terminated at nginx / Plesk; required for production browsers |
| **Object storage** (recommended) | DigitalOcean Spaces / S3-compatible (`LINODE_OBJECT_*` vars) — local `uploads/` is lost on redeploy |
| **Chromium** (optional) | Only if you use server-side PDF reports (`puppeteer`) |

---

## 1. Upload the backend folder

Upload or clone only what you need:

```
backend/
  package.json
  package-lock.json
  build.mjs
  tsconfig.json
  openapi.yaml
  src/
  scripts/          # optional — for seed/migrate
  .env              # create on server — never commit
```

Do **not** upload `node_modules/` from your PC; install on the server with `npm install`.

**Example (Git on server):**

```bash
cd /var/www/vhosts/yourdomain.com
git clone <repo-url> cms-repo
cd cms-repo/backend
```

---

## 2. Install and build

```bash
cd backend
npm install
npm run build
```

Confirm output exists:

```bash
ls -la dist/index.mjs
```

---

## 3. Environment variables

Create `backend/.env` on the server (copy from `.env.example` locally). **Never commit `.env` to git.**

### Required

```env
NODE_ENV=production
PORT=8080

DATABASE_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/CMS?retryWrites=true&w=majority
SESSION_SECRET=replace-with-long-random-string-min-32-chars

# Frontend URL(s) — exact scheme + host, comma-separated, no trailing slash
ALLOWED_ORIGINS=https://cms.satyakabir.com,https://www.cms.satyakabir.com
```

`ALLOWED_ORIGINS` must list every URL where the **browser UI** runs. Required for CORS and Socket.IO when UI and API are on different domains.

For local UI against production API during testing, you can temporarily add:

```env
ALLOWED_ORIGINS=https://cms.satyakabir.com,http://localhost:5173
```

### Object storage (recommended for production)

```env
LINODE_OBJECT_BUCKET=your-bucket
LINODE_OBJECT_STORAGE_REGION=sgp1
LINODE_OBJECT_STORAGE_ENDPOINT=https://sgp1.digitaloceanspaces.com
LINODE_OBJECT_STORAGE_ACCESS_KEY_ID=your-key
LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY=your-secret
BUCKET_FOLDER_PATH=ClientManagement-CMS/
```

Without these, uploads use local `backend/uploads/` (must be writable and backed up).

### Firebase Admin (optional — push when browser tab is closed)

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Use `\n` for newlines inside the private key string.

---

## 4. Seed database (first deploy only)

```bash
cd backend
npm run seed
# optional: npm run seed-more
```

Change default passwords after first login (see [LOCAL_RUNNING.md](../LOCAL_RUNNING.md)).

---

## 5. Run the API

### Option A — PM2 (VPS / SSH)

Use the bundled config (Node, not TypeScript, not Bun):

```bash
cd backend
npm run build
pm2 delete cms-api 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs cms-api
```

Manual start (equivalent):

```bash
pm2 start dist/index.mjs \
  --name cms-api \
  --interpreter node \
  --node-args="--env-file=.env --enable-source-maps"
```

**Wrong (causes “Interpreter bun is NOT AVAILABLE”):**

```bash
# Do NOT do this
pm2 start src/index.ts --name cms
```

Always run **`dist/index.mjs`** with **`node`**.

### Option B — Plesk Node.js

1. **Websites & Domains** → **api.yourdomain.com** → **Node.js**.
2. Enable Node.js, mode **production**.
3. **Application root:** path to `backend/` (folder containing `package.json`).
4. **Application startup file:** `dist/index.mjs`
5. **Custom environment variables:** same keys as `.env`, or rely on `.env` in application root.
6. **Start command** (if editable):

   ```bash
   node --env-file=.env --enable-source-maps ./dist/index.mjs
   ```

7. Set `PORT` in `.env` to match the port Plesk/nginx expects (often `8080` or the port Plesk assigns).

If you see **Phusion Passenger** “Web application could not be started”, check Passenger/Node logs — usually missing `npm run build`, wrong startup file, or invalid `.env`.

---

## 6. Reverse proxy (nginx)

Point the **API subdomain** to the Node process. Replace `8080` if your app uses another `PORT`.

```nginx
server {
    listen 443 ssl http2;
    server_name api.cms.satyakabir.com;

    # ssl_certificate ... (managed by Plesk / certbot)

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Optional: static uploads when not using object storage
    location /uploads/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }
}
```

On Plesk: **Apache & nginx Settings** → **Additional nginx directives** for the API domain.

---

## 7. Frontend coordination (split domain)

Before building the UI:

```env
# frontend/.env
VITE_API_BASE_URL=https://api.cms.satyakabir.com
```

Then:

```bash
cd ../frontend
npm install
npm run build
```

Deploy `frontend/dist/public/` to the **UI** host (`cms.satyakabir.com`). Details: [frontend/README.md](../frontend/README.md).

---

## 8. Verify deployment

On the server:

```bash
curl -s http://127.0.0.1:8080/api/healthz
# {"status":"ok"}
```

From your machine:

```bash
curl -s https://api.cms.satyakabir.com/api/healthz
```

In the browser (UI site):

1. Login — `POST https://api.../api/auth/login` → 200.
2. DevTools → Network — WebSocket to `wss://api.../socket.io` connects after login.
3. Upload a file — URL should point to your bucket or `/uploads/...`.

---

## 9. PDF reports (optional)

If admins use PDF export:

```bash
# Debian/Ubuntu
apt install -y chromium-browser fonts-liberation
```

Puppeteer is configured with `--no-sandbox` for typical Linux servers.

---

## 10. Updating a release

```bash
cd backend
git pull
npm install
npm run build
pm2 restart cms-api
# or restart Node.js app in Plesk
```

Run migrations/seeds only when release notes say so:

```bash
npm run migrate-company
npm run seed-more
```

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|----------------|-----|
| `Interpreter bun is NOT AVAILABLE` | PM2 started `.ts` with Bun | Use `dist/index.mjs` + `node` or `ecosystem.config.cjs` |
| Passenger 500 / app won’t start | No build, bad `.env`, wrong startup file | `npm run build`; startup `dist/index.mjs`; check logs |
| 502 Bad Gateway | Node not running or wrong proxy port | `pm2 status`; match nginx `proxy_pass` to `PORT` |
| CORS / blocked API | `ALLOWED_ORIGINS` mismatch | Exact UI URL with `https`, no trailing `/` |
| WebSocket fails | nginx missing upgrade headers | Add `/socket.io/` block above |
| `DATABASE_URL` / connection errors | Atlas IP allowlist | Add server public IP in MongoDB Atlas |
| Uploads disappear after redeploy | Local storage only | Configure `LINODE_OBJECT_*` |
| `ENOENT` on start | Missing build | Run `npm run build` in `backend/` |

**Logs:**

```bash
pm2 logs cms-api
# or Plesk Node.js application logs
```

---

## Security checklist

- [ ] `.env` is not in git and not web-accessible.
- [ ] `SESSION_SECRET` is a strong random value (production-only).
- [ ] MongoDB user has least privilege; Atlas network access restricted to server IP.
- [ ] Default seed passwords changed after first login.
- [ ] HTTPS on both API and UI domains.
- [ ] `ALLOWED_ORIGINS` lists only trusted frontend URLs.

---

## Quick reference

| Task | Command |
|------|---------|
| Build | `npm run build` |
| Start (prod) | `npm run start` |
| Dev | `npm run dev` |
| Seed | `npm run seed` |
| Typecheck | `npm run typecheck` |
| PM2 | `pm2 start ecosystem.config.cjs` |

Architecture: [README.md](./README.md) · Full stack Plesk: [DEPLOYMENT_PLESK.md](../DEPLOYMENT_PLESK.md) · Local dev: [LOCAL_RUNNING.md](../LOCAL_RUNNING.md)
