# How to Run CMS Locally

This guide covers how to get the backend and frontend running locally on your development machine using MongoDB.

## 1. Set up Environment Configuration

We've created a template `.env.example` file in the project root.

1. Create a new file named **`.env`** in this directory (`d:\Content-Management-Hub`).
2. Copy the content from `.env.example` into `.env` and customize it with your MongoDB credentials:

```bash
DATABASE_URL=mongodb://127.0.0.1:27017/nexus_cms
SESSION_SECRET=your-random-jwt-secret-key
```

> [!IMPORTANT]
> Ensure that you have a MongoDB database server running (locally or in the cloud, e.g., MongoDB Atlas) and paste its connection string into `DATABASE_URL`.

### File uploads (DigitalOcean Spaces / Linode Object Storage)

When these variables are set in `.env`, all uploads (images, documents, APKs, inventory files) go to your S3-compatible bucket instead of the local `uploads/` folder:

```bash
LINODE_OBJECT_BUCKET=your-bucket-name
LINODE_OBJECT_STORAGE_REGION=sgp1
LINODE_OBJECT_STORAGE_ENDPOINT=https://sgp1.digitaloceanspaces.com
LINODE_OBJECT_STORAGE_ACCESS_KEY_ID=your-access-key
LINODE_OBJECT_STORAGE_SECRET_ACCESS_KEY=your-secret-key
BUCKET_FOLDER_PATH=ClientManagement-CMS/
```

Files are stored under `BUCKET_FOLDER_PATH` and returned as public HTTPS URLs. Ensure the bucket (or folder) allows **public read** for assets, or set `OBJECT_STORAGE_PUBLIC_URL` if you use a CDN.

Restart the API server after changing these values. On startup you should see `objectStorage: your-bucket-name` in the logs.

### App branding (CMS)

1. Logo file: `artifacts/cms-app/public/logo.png` (served at `/logo.png`).
2. Copy `artifacts/cms-app/.env.example` to `artifacts/cms-app/.env` and set:
   - `VITE_APP_NAME=CMS`
   - `VITE_APP_SHORT_NAME=CMS`
   - `VITE_APP_LOGO=/logo.png`
3. Restart the Vite dev server after changing frontend env vars.

## 2. Initialize and Seed the Database

Once your `.env` has a valid `DATABASE_URL`, you can immediately seed the database with initial development credentials:

```powershell
# Seed initial agency, user, and demonstration data
npx pnpm --filter @workspace/scripts run seed

# (Optional) Seed even more extensive metrics, projects, and logs for analysis testing
npx pnpm --filter @workspace/scripts run seed-more
```

## 3. Start the Applications

Start both servers in separate terminal windows:

### Terminal A: Start Backend Server (Runs on port 8080)
```powershell
npx pnpm --filter @workspace/api-server run dev
```

### Terminal B: Start Frontend Client (Runs on port 5173)
```powershell
npx pnpm --filter @workspace/cms-app run dev
```

Once started, open your browser to **http://localhost:5173**.

> [!NOTE]
> The frontend Vite server is pre-configured to automatically proxy `/api` requests to the backend on `http://localhost:8080`.

## Notifications & alert sound

- **In-app (Socket.IO):** Works without Firebase — new messages and notifications appear instantly while the app is open.
- **Repeating alert sound:** Plays every ~2 seconds when you have unread notifications until you mark them read (bell menu → Mark all read, or open **Notifications**).
- **Firebase push (optional):** For mobile/desktop push when the browser tab is closed, add to root `.env`:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY` (from Firebase service account; use `\n` for newlines)
- Frontend keys are in `artifacts/cms-app/.env` (`VITE_FIREBASE_*` + `VITE_FIREBASE_VAPID_KEY`).

---

## Seed Credentials

After running the seed command, you can log in with the following default users:

| Role | Email | Employee ID | Password |
|------|-------|-------------|----------|
| **Super Admin** | admin@agency.com | — | `Admin@123` |
| **Developer (Alice)** | alice@agency.com | `AL001` | `Dev@123` |
| **Developer (Bob)** | bob@agency.com | `BO002` | `Dev@123` |
| **Tester (David)** | david@agency.com | — | `Dev@123` |
| **Client** | client@example.com | — | `Client@123` |
  