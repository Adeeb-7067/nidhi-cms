# CMS Desktop (Electron) — Install & Setup Guide

This guide covers how to **build**, **distribute**, and **install** the CMS Desktop app on an employee’s local machine. The desktop app is required for **screenshot monitoring** and the full attendance workflow. The **web app** supports clock-in/out but **does not capture screenshots**.

For monitoring architecture and admin workflows, see [`SCREENSHOT_MONITORING_GUIDE.txt`](SCREENSHOT_MONITORING_GUIDE.txt).

---

## Quick start — generate a desktop installer

Use this when you want a **`.exe`** (Windows), **`.dmg`** (Mac), or **`.AppImage` / `.deb`** (Linux) to send to staff.

### Prerequisites (one-time)

```powershell
cd D:\Content-Management-Hub\frontend
npm install

cd ..\electron
npm install
```

### Windows installer (`.exe`) — run on Windows

Replace the API URL with your **live backend** (employees must reach it from their PCs):

```powershell
cd D:\Content-Management-Hub\electron

$env:VITE_API_BASE_URL = "https://api.cms.satyakabir.co.in"

npm run build:win
```

What this does:
1. Builds the React UI into `frontend/dist/electron/` (with `VITE_ELECTRON=true` and your API URL embedded).
2. Packages everything with **electron-builder** into an NSIS installer.

**Output folder:** `electron/dist-electron/`  
**File to distribute:** `CMS Desktop Setup 1.0.0.exe` (version matches `electron/package.json`).

Double-click that `.exe` on any Windows 10/11 PC to install CMS Desktop.

### macOS installer (`.dmg`) — must run on a Mac

```powershell
cd electron
$env:VITE_API_BASE_URL = "https://api.yourdomain.com"
npm run build:mac
```

**Output:** `electron/dist-electron/*.dmg`

### Linux packages

```powershell
cd electron
$env:VITE_API_BASE_URL = "https://api.cms.satyakabir.co.in"
npm run build:linux
```

**Output:** `electron/dist-electron/*.AppImage` and/or `*.deb`

### Important build rules

| Rule | Why |
|------|-----|
| Set `VITE_API_BASE_URL` **before** building | The API address is compiled into the app; users cannot change it in settings. |
| Rebuild after **any frontend change** | The installer bundles a static copy of the UI. |
| `write-api-config.js` runs on every build | Embeds your API URL for **screenshot uploads** in the main process (not only the UI). |
| Windows `.exe` only builds on **Windows** | electron-builder cross-compiles some targets, but Mac builds need macOS for signing/notarization. |
| Backend must allow CORS from Electron | Set `ALLOWED_ORIGINS` on the API if you restrict origins (desktop uses your API URL directly). |

### Local test installer (points at localhost)

Only for testing on your own machine — not for employees:

```powershell
cd D:\Content-Management-Hub\electron
$env:VITE_API_BASE_URL = "http://localhost:8080"
npm run build:win
```

Install the `.exe`, ensure `backend` is running, then open CMS Desktop.

---

## What the desktop app does

| Feature | Web browser | CMS Desktop (Electron) |
|--------|-------------|-------------------------|
| Login, projects, bugs, tasks | Yes | Yes |
| Clock in / clock out | Yes | Yes |
| Screenshot monitoring | **No** | **Yes** (when enabled by admin + consent given) |
| Runs in system tray while working | No | Yes (while app is open; closing ✕ quits and clocks out) |
| Auto-update (packaged builds) | N/A | Yes (GitHub Releases) |

**Who needs the desktop app:** developers, testers, QA, and freelancers when your organization uses screenshot monitoring.

---

## Prerequisites

### For employees (end users)

- **Windows 10/11 (64-bit)** — primary supported installer (`.exe`)
- macOS or Linux builds are available if your IT team provides them
- Network access to your CMS **API URL** (e.g. `https://api.yourcompany.com`)
- Valid CMS account (employee ID + password, or email login as configured)
- **Screen recording permission** (macOS) — macOS will prompt on first capture

### For IT / developers (building the installer)

- Node.js 18+ and npm
- This repository cloned locally
- Backend API running and reachable from employee machines
- For production installers: set `VITE_API_BASE_URL` to your **public API URL** before building

---

## Option A — Install from a pre-built installer (recommended for employees)

Your admin or IT team builds the installer once and shares the file.

### Windows

1. Download **`CMS Desktop Setup x.x.x.exe`** from your IT team (built into `electron/dist-electron/`).
2. Double-click the installer.
3. Choose install location (optional — installer allows custom directory).
4. Finish setup — shortcuts are created on the **Desktop** and **Start menu**.
5. Launch **CMS Desktop**.
6. Log in with your CMS credentials.
7. If monitoring is enabled:
   - Accept the **consent** banner (bottom-right).
   - Click **Clock In** in the top bar when you start work.
8. To exit properly: click **Clock Out**, close the window (✕), or use **tray → Quit**. All paths clock you out. Avoid Task Manager kill when possible.

### macOS

1. Open the `.dmg` provided by IT.
2. Drag **CMS Desktop** to Applications.
3. First launch: if macOS blocks the app, go to **System Settings → Privacy & Security** and allow it.
4. Grant **Screen Recording** when prompted (required for screenshots).
5. Log in, consent, and clock in as above.

### Linux

IT may provide an **AppImage** or **.deb** package from `npm run build:linux`.

---

## Option B — Run from source (developers / local testing)

Use this when you are developing or testing against a local backend.

### 1. Install dependencies (once)

```powershell
cd backend
npm install

cd ..\frontend
npm install

cd ..\electron
npm install
```

### 2. Configure environment

**Backend** — `backend/.env`:

```env
DATABASE_URL=mongodb://127.0.0.1:27017/nexus_cms
SESSION_SECRET=your-random-jwt-secret-key
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

**Frontend** — `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

> The Electron launcher reads `VITE_API_BASE_URL` from `frontend/.env` and passes it to the main process as `CMS_API_URL`.

### 3. Seed database (first time)

```powershell
cd backend
npm run seed
```

Example login: `alice@agency.com` / `Dev@123` (developer) or create a freelancer from **Admin → Team**.

### 4. Start the backend

```powershell
cd backend
npm run dev
```

Keep this terminal running.

### 5. Build the frontend for Electron

The desktop app loads a **static build**, not the Vite dev server. Re-run this after UI changes:

```powershell
cd frontend
$env:VITE_API_BASE_URL = "http://localhost:8080"
npm run build:electron
```

Output: `frontend/dist/electron/`

### 6. Launch Electron

```powershell
cd electron
npm run dev
```

Or: `node launch.js`

**Hot reload:** After frontend code changes, run `npm run build:electron` again, then press **Ctrl+R** inside the Electron window.

---

## Option C — Build a production installer (IT / release manager)

Point the desktop app at your **production API** before building.

### Windows installer

```powershell
$env:VITE_API_BASE_URL = "https://api.yourdomain.com"

cd frontend
npm run build:electron

cd ..\electron
npm run build:win
```

**Output:** `electron/dist-electron/CMS Desktop Setup *.exe`

### macOS installer (must run on a Mac)

```powershell
$env:VITE_API_BASE_URL = "https://api.yourdomain.com"
cd frontend; npm run build:electron
cd ..\electron; npm run build:mac
```

**Output:** `electron/dist-electron/*.dmg`

### Linux

```powershell
cd electron
npm run build:linux
```

**Output:** AppImage and/or `.deb` in `electron/dist-electron/`

### Auto-updates

Packaged builds check **GitHub Releases** on startup (`electron-builder` publish config in `electron/package.json`). Ensure release artifacts are published there, or disable/update the publish config for your own update server.

---

## First day checklist (employee)

1. Install CMS Desktop from the installer your company provides.
2. Open the app and log in.
3. If you see a **monitoring consent** card → read and click **Allow monitoring**.
4. Click **Clock In** when you start work.
5. Keep the app open while working. When finished, click **Clock Out**, close the window (✕), or use tray **Quit** — all clock you out.
6. Use the **web app** for general browsing if you prefer; use **Desktop** when monitoring must apply.

---

## Connecting to your company server

The API URL is **baked into the installer at build time** via `VITE_API_BASE_URL`. Employees do not configure this in the UI.

| Build command uses | Desktop app connects to |
|--------------------|-------------------------|
| `http://localhost:8080` | Local dev backend |
| `https://api.yourdomain.com` | Production API |

If IT changes the API domain, employees need a **new installer** built with the updated URL.

---

## Troubleshooting

| Problem | What to try |
|--------|-------------|
| Blank window after install | IT built without `VITE_API_BASE_URL`; rebuild installer with correct API URL. |
| Login fails | Confirm API is up, credentials correct, and firewall allows HTTPS to API. |
| No Clock In button | Your role may not be monitorable (developer, tester, QA, freelancer). Contact admin. |
| Clock In works but no screenshots | Monitoring may be off in Settings, consent not given, or you are on **web** not Desktop. |
| Screenshots work on **your PC** but not on colleagues' PCs | Old installers uploaded screenshots to `localhost` only. **Rebuild** with latest code (`npm run build:win`); the build writes `api-config.json` with your production API URL. Redistribute the new `.exe`. |
| macOS: no screenshots | System Settings → Privacy & Security → **Screen Recording** → enable for CMS Desktop. |
| Session stuck after crash | Admin can force-terminate in Attendance; sessions with no heartbeat auto-close within ~3 min; 24 h fallback for edge cases. |
| App already running | Single-instance lock — check system tray for existing CMS Desktop icon. |
| Build fails: `Cannot create symbolic link : A required privilege is not held by the client` | Windows blocked symlink creation while extracting electron-builder signing tools. **Fix A:** Settings → System → For developers → turn **Developer Mode** ON, then rebuild. **Fix B:** Run PowerShell **as Administrator** and rebuild. **Fix C:** This repo sets `signAndEditExecutable: false` in `electron/package.json` for unsigned local builds — pull latest and run `npm run build:win` again. |
| `default Electron icon is used` | Add `electron/assets/icon.ico` (256×256) for a custom app/installer icon. |

---

## Related docs

| Document | Purpose |
|----------|---------|
| [`LOCAL_RUNNING.md`](LOCAL_RUNNING.md) | Full local dev (web + API + Electron) |
| [`SCREENSHOT_MONITORING_GUIDE.txt`](SCREENSHOT_MONITORING_GUIDE.txt) | Monitoring architecture, admin workflows, API reference |
| [`frontend/README.md`](frontend/README.md) | Web frontend deployment |
| [`backend/README.md`](backend/README.md) | API deployment |
