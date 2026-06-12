const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  shell,
  dialog,
  session,
  nativeImage,
  desktopCapturer,
  powerMonitor,
} = require('electron');
const path = require('path');

// ─── Single-instance lock ────────────────────────────────────────────────────
// Prevents opening a second copy when the user double-clicks the icon again.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ─── Windows taskbar/notifications identity ──────────────────────────────────
if (process.platform === 'win32') {
  app.setAppUserModelId('com.contentmanagementhub.cms');
}

// ─── State ───────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let isQuitting = false;
let isQuitReady = false;              // set true once clock-out is done (or timed out)
let isGracefulQuitInitiated = false;  // guard: prevent sending cms:pre-quit twice
let screenshotTimer = null;
let screenshotIntervalMs = 0;
let screenshotPauseTimer = null;
let currentSessionId = 0;         // tracks the active work session id for screenshot uploads

// ─── Path helpers (dev vs packaged) ──────────────────────────────────────────
// In dev:       __dirname === .../electron/
//               frontend dist is at .../frontend/dist/electron/
// In packaged:  frontend is in extraResources → process.resourcesPath/frontend/dist/electron
//               assets are in extraResources  → process.resourcesPath/electron/assets
//               preload is in the ASAR alongside main.js → __dirname/preload.js
const FRONTEND_DIST = app.isPackaged
  ? path.join(process.resourcesPath, 'frontend', 'dist', 'electron')
  : path.join(__dirname, '..', 'frontend', 'dist', 'electron');

// preload.js lives next to main.js — works in both dev (__dirname) and ASAR (__dirname inside asar)
const PRELOAD_PATH = path.join(__dirname, 'preload.js');

const ASSETS_DIR = app.isPackaged
  ? path.join(process.resourcesPath, 'electron', 'assets')
  : path.join(__dirname, 'assets');

// ─── Auto-updater (lazy) ─────────────────────────────────────────────────────
// Must be required AFTER app is ready — it calls app.getVersion() on import.
let _autoUpdater = null;
function getAutoUpdater() {
  if (!_autoUpdater) _autoUpdater = require('electron-updater').autoUpdater;
  return _autoUpdater;
}

// ─── Backend URL (passed from launch.js via CMS_API_URL) ─────────────────────
const API_URL = (process.env.CMS_API_URL || 'http://localhost:15000').replace(/\/+$/, '');

// ─── CSP ─────────────────────────────────────────────────────────────────────
// Applied only to HTML responses (where CSP is meaningful).
// connect-src allows both http: and https: so the renderer can reach the
// backend regardless of whether it is served over HTTP (local dev) or HTTPS
// (production). ws:/wss: covers Socket.io in both environments.
const CSP = [
  "default-src 'self' https: data: blob:;",
  "script-src 'self' 'unsafe-inline';",           // Vite injects inline init scripts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
  "font-src 'self' https://fonts.gstatic.com data:;",
  "img-src 'self' data: blob: https: http://localhost:* http://127.0.0.1:*;",
  "connect-src 'self' http: https: ws: wss:;",   // allows local HTTP + production HTTPS
  "worker-src 'self' blob:;",
  "frame-src 'none';",
  "object-src 'none';",
].join(' ');

function applyCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const isHtml =
      details.responseHeaders?.['content-type']?.[0]?.includes('text/html') ??
      details.url.endsWith('.html') ??
      details.url.endsWith('/');

    if (!isHtml) {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
      },
    });
  });
}

// ─── Media redirect ───────────────────────────────────────────────────────────
// The backend stores image URLs as relative paths, e.g. /uploads/photo.jpg.
// In file:// context these resolve to file:///uploads/photo.jpg (a local path
// that doesn't exist). Intercept them and redirect to the real backend origin.
function applyMediaRedirect() {
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['file:///uploads/*'] },
    (details, callback) => {
      // file:///uploads/foo.jpg -> /uploads/foo.jpg -> API_URL/uploads/foo.jpg
      const urlPath = details.url.slice('file://'.length);
      callback({ redirectURL: `${API_URL}${urlPath}` });
    }
  );
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const iconPath = path.join(ASSETS_DIR, iconFile);

  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) throw new Error('empty image');
  } catch {
    // Icon asset missing in dev — tray is optional
    return;
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('CMS Desktop');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open CMS', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => initiateGracefulQuit() },
    ])
  );
  tray.on('double-click', () => mainWindow?.show());
}

// ─── Main window ──────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'CMS Desktop',
    show: false, // show after ready-to-show to avoid white flash
    webPreferences: {
      contextIsolation: true,      // renderer cannot access Node APIs
      nodeIntegration: false,       // Node not available in renderer
      sandbox: true,                // renderer runs in OS sandbox
      preload: PRELOAD_PATH,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Avoid white flash on startup
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // If the frontend build is missing, show a helpful error instead of a blank screen
  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDesc, url) => {
    if (url.startsWith('file://')) {
      dialog.showErrorBox(
        'CMS Desktop — could not load app',
        `Failed to load: ${url}\n\n` +
        `Build the frontend first:\n  cd frontend && npm run build:electron\n\nError: ${errorDesc} (${errorCode})`
      );
    }
  });

  // All target="_blank" or window.open() calls → OS default browser
  // Validate scheme before opening — prevents data: and javascript: exploitation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Block in-page navigations to external URLs (e.g. clicking <a href="https://...">)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadFile(path.join(FRONTEND_DIST, 'index.html'));
}

// ─── Second-instance handler ──────────────────────────────────────────────────
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// ─── IPC handlers ────────────────────────────────────────────────────────────
ipcMain.handle('open-external', (_, url) => {
  // Validate URL scheme before opening — prevent file:// or data: exploitation
  const safe = /^https?:\/\//.test(url);
  if (safe) shell.openExternal(url);
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('show-open-dialog', (_, opts) =>
  dialog.showOpenDialog(mainWindow, opts)
);

ipcMain.handle('check-for-updates', () => {
  if (app.isPackaged) getAutoUpdater().checkForUpdates();
});

ipcMain.handle('quit-and-install', () => {
  isQuitting = true;
  getAutoUpdater().quitAndInstall();
});

// ─── Screenshot monitoring ────────────────────────────────────────────────────
const IDLE_THRESHOLD_SECONDS = 5 * 60;
const BASE_TOOLTIP = 'CMS Desktop';

function setMonitoringState(state) {
  if (tray) {
    const suffix =
      state === 'active' ? ' · Screen monitoring active' :
      state === 'paused' ? ' · Screen monitoring paused' : '';
    tray.setToolTip(`${BASE_TOOLTIP}${suffix}`);
  }
  mainWindow?.webContents.send('cms:monitoring-state', state);
}

function stopScreenshotScheduler() {
  if (screenshotTimer) {
    clearInterval(screenshotTimer);
    screenshotTimer = null;
  }
}

function startScreenshotScheduler(intervalMs, captureImmediately = false) {
  stopScreenshotScheduler();
  screenshotIntervalMs = intervalMs;
  screenshotTimer = setInterval(() => {
    captureAndUpload().catch((err) =>
      console.error('[screenshot] capture failed:', err.message)
    );
  }, intervalMs);
  if (captureImmediately) {
    // Fire one capture right now so every session has a starting screenshot
    // at the exact moment monitoring begins, then the interval takes over.
    captureAndUpload().catch((err) =>
      console.error('[screenshot] initial capture failed:', err.message)
    );
  }
}

async function captureAndUpload() {
  if (!mainWindow) return;

  if (powerMonitor.getSystemIdleTime() > IDLE_THRESHOLD_SECONDS) {
    console.log('[screenshot] skipped — user idle');
    return;
  }

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1280, height: 720 },
  });
  const primary = sources[0];
  if (!primary) {
    console.warn('[screenshot] no screen source found');
    return;
  }

  const buffer = primary.thumbnail.toPNG();

  let token;
  try {
    token = await mainWindow.webContents.executeJavaScript(
      'localStorage.getItem("accessToken")'
    );
  } catch {
    console.warn('[screenshot] could not read access token');
    return;
  }
  if (!token) {
    console.warn('[screenshot] no access token — user not logged in');
    return;
  }

  const uploadUrl = `${API_URL}/api/screenshots`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: 'image/png' }), 'screenshot.png');
      if (currentSessionId) form.append('sessionId', String(currentSessionId));
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      console.log('[screenshot] uploaded successfully');
      return;
    } catch (err) {
      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[screenshot] attempt ${attempt + 1} failed (${err.message}), retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        // Window may have been closed while we were waiting — abort remaining retries.
        if (!mainWindow || mainWindow.isDestroyed()) break;
      } else {
        console.error(`[screenshot] all upload attempts failed: ${err.message}`);
      }
    }
  }
}

ipcMain.on('cms:screenshot-config', (_, { enabled, intervalMs, sessionId }) => {
  if (screenshotPauseTimer) {
    clearTimeout(screenshotPauseTimer);
    screenshotPauseTimer = null;
  }

  // Capture immediately when monitoring transitions from off → on, or when
  // a new session starts. Skip if the scheduler was already running for the
  // same session (e.g. 60-second config poll with nothing changed).
  const wasSchedulerRunning = screenshotTimer !== null;
  const isNewSession = sessionId !== 0 && sessionId !== currentSessionId;
  const captureImmediately = enabled && (!wasSchedulerRunning || isNewSession);

  currentSessionId = sessionId || 0;

  if (enabled) {
    startScreenshotScheduler(intervalMs, captureImmediately);
    setMonitoringState('active');
  } else {
    stopScreenshotScheduler();
    screenshotIntervalMs = 0;
    setMonitoringState('off');
  }
});

ipcMain.on('cms:screenshot-pause', (_, { durationMs }) => {
  stopScreenshotScheduler();
  setMonitoringState('paused');
  if (screenshotPauseTimer) clearTimeout(screenshotPauseTimer);
  screenshotPauseTimer = setTimeout(() => {
    screenshotPauseTimer = null;
    if (screenshotIntervalMs > 0) {
      startScreenshotScheduler(screenshotIntervalMs);
      setMonitoringState('active');
    }
  }, durationMs);
});

// ─── Pre-quit clock-out ───────────────────────────────────────────────────────
// When quitting, tell the renderer to clock out first. The renderer sends
// cms:clock-out-done when finished (or we force-quit after 4 s).
ipcMain.on('cms:clock-out-done', () => {
  isQuitReady = true;
  stopScreenshotScheduler();
  app.quit();
});

async function initiateGracefulQuit() {
  // Double-entry guard: before-quit can fire multiple times (e.g. tray Quit +
  // quitAndInstall in quick succession). Only process the first call.
  if (isQuitReady || isGracefulQuitInitiated) return;
  isGracefulQuitInitiated = true;

  stopScreenshotScheduler();

  if (mainWindow && !mainWindow.isDestroyed()) {
    // Ask renderer to clock out; it replies with cms:clock-out-done
    mainWindow.webContents.send('cms:pre-quit');
    // Safety net: force quit after 4 s if renderer doesn't respond
    setTimeout(() => {
      if (!isQuitReady) { isQuitReady = true; app.quit(); }
    }, 4000);
  } else {
    isQuitReady = true;
    app.quit();
  }
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Remove the default "File Edit View Window Help" menu bar entirely
  Menu.setApplicationMenu(null);

  applyCSP();
  applyMediaRedirect();
  createWindow();
  createTray();

  if (app.isPackaged) {
    const updater = getAutoUpdater();
    updater.on('update-available', (info) =>
      mainWindow?.webContents.send('update-available', info)
    );
    updater.on('update-downloaded', (info) =>
      mainWindow?.webContents.send('update-downloaded', info)
    );
    updater.checkForUpdatesAndNotify();
  }
});

// Registering this listener (even empty) overrides Electron's default "quit on
// last window closed" behaviour — the app stays alive in the tray on all platforms.
app.on('window-all-closed', () => {});

app.on('before-quit', (e) => {
  isQuitting = true;
  if (!isQuitReady) {
    e.preventDefault();
    initiateGracefulQuit();
  }
});

// macOS: clicking the Dock icon re-shows the window
app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});
