# Deploy Nexus CMS on Plesk (Linux)

This guide assumes **one domain** for the app (e.g. `cms.yourdomain.com`): static React files at the web root, API and WebSockets proxied to Node.js on port `8080`.

## What you need on the server

| Requirement | Notes |
|-------------|--------|
| **Plesk** with **Node.js** extension | Node **20+** (uses `--env-file`) |
| **MongoDB** | Use [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended). Plesk does not install MongoDB by default. |
| **pnpm** | Install on server, or build locally and upload `dist` folders only |
| **Chromium** (optional) | Only if you use server-side PDF reports (`puppeteer`) |

---

## 1. Upload the project

**Option A — Git (recommended)**

```bash
cd /var/www/vhosts/yourdomain.com
git clone <your-repo-url> httpdocs/cms-repo
cd httpdocs/cms-repo
```

**Option B — ZIP**

Upload the project (without `node_modules`) into e.g. `/var/www/vhosts/yourdomain.com/cms-repo`.

---

## 2. Install dependencies and build (SSH)

```bash
cd /var/www/vhosts/yourdomain.com/cms-repo

# Install pnpm if missing
npm install -g pnpm

pnpm install
pnpm run build
```

Outputs:

- API: `artifacts/api-server/dist/index.mjs`
- Frontend: `artifacts/cms-app/dist/public/` (contains `index.html`, `assets/`)

---

## 3. Production `.env` (repo root)

Create `/var/www/vhosts/yourdomain.com/cms-repo/.env` (Plesk → **Websites & Domains** → your site → **Environment Variables** can mirror these):

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=mongodb+srv://USER:PASS@cluster.mongodb.net/nexus_cms
SESSION_SECRET=use-a-long-random-string-here

# Your public site URL (for CORS + Socket.IO)
ALLOWED_ORIGINS=https://cms.yourdomain.com

# Object storage (recommended on Plesk — local uploads are lost on redeploy)
LINODE_OBJECT_BUCKET=your-bucket
LINODE_OBJECT_STORAGE_REGION=sgp1
LINODE_OBJECT_STORAGE_ENDPOINT=https://sgp1.digitaloceanspaces.com
LINODE_OBJECT_STORAGE_ACCESS_KEY_ID=...
LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY=...
BUCKET_FOLDER_PATH=ClientManagement-CMS/

# Optional Firebase (push when browser tab closed)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

**Frontend build:** If API is on the **same domain** (proxy below), you do **not** need `VITE_API_BASE_URL`. If API is on another subdomain, set before `pnpm run build`:

```bash
# artifacts/cms-app/.env.production
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
```

Then run `pnpm --filter @workspace/cms-app run build` again.

---

## 4. Seed database (once, SSH)

```bash
cd /var/www/vhosts/yourdomain.com/cms-repo
npx pnpm --filter @workspace/scripts run seed
```

Log in and change default passwords from [LOCAL_RUNNING.md](./LOCAL_RUNNING.md).

---

## 5. Run the API with Plesk Node.js

1. **Websites & Domains** → your domain → **Node.js**.
2. Enable Node.js.
3. Set:
   - **Application root:** `cms-repo/artifacts/api-server` (path relative to subscription home, adjust to your upload path)
   - **Application startup file:** `dist/index.mjs`
   - **Application mode:** `production`
4. **Document root** stays the **frontend** folder (step 6), not the API folder.
5. In **Custom environment variables**, add the same keys as `.env`, or ensure the start command loads `.env`.

**Start command** (if Plesk asks for a custom script):

```bash
node --env-file=../../.env --enable-source-maps ./dist/index.mjs
```

Working directory must be `artifacts/api-server` so `../../.env` points at the repo root.

6. Note the **port** Plesk assigns (often `3000`). If it is not `8080`, either set `PORT` in `.env` to match, or use that port in nginx proxy below.

**Keep the Node app running:** enable Plesk **Process Manager** / restart policy if available.

---

## 6. Serve the React app (document root)

Point the domain **document root** to the built frontend:

```
/var/www/vhosts/yourdomain.com/cms-repo/artifacts/cms-app/dist/public
```

Or copy `dist/public/*` into `httpdocs/` if you prefer the default Plesk layout.

---

## 7. Reverse proxy `/api` and `/socket.io` (required)

Plesk → domain → **Apache & nginx Settings** → **Additional nginx directives** (or use **Proxy Rules** if your Plesk version has it):

Replace `8080` with your Node.js app port if different.

```nginx
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
```

**SPA routing** — same panel, ensure unknown paths serve `index.html`:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Apply and reload nginx.

---

## 8. SSL

Plesk → **SSL/TLS** → **Let's Encrypt** → install certificate for `cms.yourdomain.com`.

Set `ALLOWED_ORIGINS=https://cms.yourdomain.com` (must match the live URL, including `https`).

---

## 9. File uploads

| Mode | When |
|------|------|
| **Object storage** (`LINODE_OBJECT_*`) | Production on Plesk — files survive redeploys |
| **Local `uploads/`** | Dev only; folder must be writable by the Node user and backed up |

---

## 10. PDF reports (optional)

If you use admin PDF exports that hit the API:

```bash
# Debian/Ubuntu on the server
apt install -y chromium-browser fonts-liberation
```

Puppeteer already uses `--no-sandbox` in code for Linux servers.

---

## 11. Verify

1. `https://cms.yourdomain.com` — login page loads.
2. Browser DevTools → Network — login `POST /api/auth/login` returns 200.
3. Bell / notifications — WebSocket connects (`socket.io` in Network, WS).
4. Upload a test image — URL should be your bucket or `/uploads/...`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| **502 on /api** | Node app not running; wrong proxy port; check Plesk Node.js logs |
| **CORS errors** | Set `ALLOWED_ORIGINS` to exact frontend URL |
| **WebSocket fails** | Confirm nginx `socket.io` block; SSL terminates at Plesk — use `wss` via same host |
| **Blank page after refresh** | Add `try_files ... /index.html` |
| **DB connection failed** | Atlas IP allowlist: add server public IP (or `0.0.0.0/0` for testing only) |
| **ENOENT on start** | Run `pnpm run build` on server; check startup path `dist/index.mjs` |

---

## Updating a release

```bash
cd /var/www/vhosts/yourdomain.com/cms-repo
git pull
pnpm install
pnpm run build
# Restart Node.js app in Plesk
```

If you only changed the frontend, rebuilding `cms-app` and refreshing the document root is enough.

---

## Security reminders

- Never commit `.env` to git.
- Rotate `SESSION_SECRET` and database passwords for production.
- Restrict MongoDB Atlas to your server IP.
- Change seed user passwords after first login.
