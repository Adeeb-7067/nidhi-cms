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
  Notification,
} = require('electron');
const path = require('path');
const fs = require('fs');
const { isSensitiveForegroundApp } = require('./sensitive-apps');
const {
  applyFullBlur,
  detectSensitiveBeforeCapture,
  getForegroundWindow,
  formatForegroundLabel,
} = require('./screenshot-blur');

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
let heartbeatTimer = null;
let clockOutPromise = null;
let quitInProgress = null;
let powerMonitorRegistered = false;
let blurSensitiveAppsEnabled = false;
/** Cached from renderer so heartbeat/screenshot/clock-out work when webContents is torn down. */
let cachedAccessToken = null;
/** True when suspend interrupted an active session — renderer should clock back in on resume. */
let resumeShouldClockIn = false;
let lastPowerStopReason = null;

const HEARTBEAT_INTERVAL_MS = 30_000;
const CLOCK_OUT_TIMEOUT_MS = 15_000;
const HEARTBEAT_FETCH_TIMEOUT_MS = 20_000;

/** Auto clock-out only for definitive local events. Transient network/API errors do NOT end sessions. */
const DEFINITIVE_LOCAL_STOP_REASONS = new Set([
  'system_sleep',
  'system_shutdown',
  'app_quit',
]);

const SESSION_END_NATIVE_COPY = {
  system_sleep: {
    title: 'Session paused — PC sleep',
    body: 'You were clocked out because your PC went to sleep. Resuming when you wake…',
  },
  system_shutdown: {
    title: 'Session paused — PC shutdown',
    body: 'You were clocked out because your PC is shutting down. Clock in after restart.',
  },
  app_quit: {
    title: 'Session paused — app closed',
    body: 'You were clocked out because the desktop app was closed. Clock in again today to continue.',
  },
  shift_ended: {
    title: 'Automatically clocked out — shift ended',
    body: 'Your scheduled shift ended. Clock in again for overtime or that time will not count.',
  },
  day_ended: {
    title: 'Previous work day ended',
    body: 'A new work day started. Clock in to begin today\'s new session.',
  },
  session_expired: {
    title: 'Session closed — 24-hour limit',
    body: 'Your session hit the 24-hour limit. Clock in to start a new session.',
  },
  client_disconnected: {
    title: 'Session paused — connection lost',
    body: 'Your session was paused because the app stopped sending heartbeats. Clock in again today to continue.',
  },
  overtime_idle: {
    title: 'Overtime session paused — inactive',
    body: 'No activity detected. Clock in again today to resume overtime.',
  },
  system_resumed: {
    title: 'Resuming work session',
    body: 'Your PC woke up. Continuing today\'s session (sleep time is not counted).',
  },
};

function showNativeSessionNotification(stopReason, override = null) {
  if (!Notification.isSupported()) return;
  const copy = override ?? SESSION_END_NATIVE_COPY[stopReason];
  if (!copy?.title || !copy?.body) return;
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const iconPath = path.join(ASSETS_DIR, iconFile);
  try {
    const notification = new Notification({
      title: copy.title,
      body: copy.body,
      icon: fs.existsSync(iconPath) ? iconPath : undefined,
      silent: false,
    });
    notification.on('click', () => focusMainWindow());
    notification.show();
  } catch (err) {
    console.warn('[notification] could not show session alert:', err.message);
  }
}

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

function readBundledApiUrl() {
  const configPath = path.join(ASSETS_DIR, 'api-config.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (parsed.apiUrl) return String(parsed.apiUrl).replace(/\/+$/, '');
  } catch {
    /* missing in dev until write-api-config.js runs */
  }
  return null;
}

/** Upload URL base — updated from renderer on each screenshot-config sync. */
let runtimeApiBaseUrl = null;

function resolveApiBaseUrl() {
  return (
    runtimeApiBaseUrl ||
    process.env.CMS_API_URL ||
    readBundledApiUrl() ||
    'http://localhost:8080'
  ).replace(/\/+$/, '');
}

// ─── Auto-updater (lazy) ─────────────────────────────────────────────────────
// Must be required AFTER app is ready — it calls app.getVersion() on import.
let _autoUpdater = null;
function getAutoUpdater() {
  if (!_autoUpdater) _autoUpdater = require('electron-updater').autoUpdater;
  return _autoUpdater;
}

// ─── Backend URL (launch.js env, bundled api-config.json, or renderer sync) ──
// Used for file:///uploads/* redirects before login. Screenshot uploads also
// call resolveApiBaseUrl() which prefers runtimeApiBaseUrl from the renderer.
const API_URL = resolveApiBaseUrl();
console.log('[cms] API base URL:', API_URL);

// ─── CSP ─────────────────────────────────────────────────────────────────────
// Applied only to HTML responses (where CSP is meaningful).
// connect-src allows both http: and https: so the renderer can reach the
// backend regardless of whether it is served over HTTP (local dev) or HTTPS
// (production). ws:/wss: covers Socket.io in both environments.
// img-src includes the live API origin so LAN/dev HTTP gallery proxies work.
function buildCsp() {
  let apiOrigin = null;
  try {
    apiOrigin = new URL(resolveApiBaseUrl()).origin;
  } catch {
    /* ignore */
  }
  const imgParts = new Set([
    "'self'",
    'data:',
    'blob:',
    'https:',
    'http://localhost:*',
    'http://127.0.0.1:*',
  ]);
  if (apiOrigin) imgParts.add(apiOrigin);

  return [
    "default-src 'self' https: data: blob:;",
    "script-src 'self' 'unsafe-inline';",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
    "font-src 'self' https://fonts.gstatic.com data:;",
    `img-src ${[...imgParts].join(' ')};`,
    "connect-src 'self' http: https: ws: wss:;",
    "worker-src 'self' blob:;",
    "frame-src 'none';",
    "object-src 'none';",
  ].join(' ');
}

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
        'Content-Security-Policy': [buildCsp()],
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
      callback({ redirectURL: `${resolveApiBaseUrl()}${urlPath}` });
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
      { label: 'Open CMS', click: () => focusMainWindow() },
      { type: 'separator' },
      { label: 'Quit', click: () => initiateGracefulQuit() },
    ])
  );
  tray.on('double-click', () => focusMainWindow());
}

// ─── Window manager (industry pattern) ───────────────────────────────────────
// Single gateway for all BrowserWindow access — never call mainWindow?.foo() directly.
// Slack/VS Code/1Password all use: getWindow → isDestroyed check → recreate if needed.

function getMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  return null;
}

function isRendererAvailable() {
  if (isQuitting || isGracefulQuitInitiated || isQuitReady) return false;
  const win = getMainWindow();
  if (!win) return false;
  const wc = win.webContents;
  return Boolean(wc && !wc.isDestroyed());
}

function sendToRenderer(channel, payload) {
  if (!isRendererAvailable()) return false;
  try {
    getMainWindow().webContents.send(channel, payload);
    return true;
  } catch {
    return false;
  }
}

let isCreatingWindow = false;

function focusMainWindow() {
  if (isQuitting) return;
  const win = getMainWindow();
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
    return;
  }
  createWindow();
}

function createWindow() {
  if (isCreatingWindow) return getMainWindow();
  if (getMainWindow()) return mainWindow;

  isCreatingWindow = true;
  try {
    const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
    const iconPath = path.join(ASSETS_DIR, iconFile);
    const fallbackIconPath = path.join(ASSETS_DIR, 'icon.png');
    const windowIcon = fs.existsSync(iconPath)
      ? iconPath
      : (fs.existsSync(fallbackIconPath) ? fallbackIconPath : undefined);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'CMS Desktop',
    icon: windowIcon,
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
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

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

  // Closing the window clocks out and quits — no minimize-to-tray on ✕.
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      initiateGracefulQuit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(FRONTEND_DIST, 'index.html'));
  return mainWindow;
  } finally {
    isCreatingWindow = false;
  }
}

// ─── Second-instance handler (Electron official pattern) ─────────────────────
// User double-clicks shortcut while app is running → focus existing window.
// If the process is quitting, ignore — the new launch will get the lock after exit.
app.on('second-instance', () => {
  if (isQuitting) return;
  focusMainWindow();
});

// ─── IPC handlers ────────────────────────────────────────────────────────────
ipcMain.handle('open-external', (_, url) => {
  // Validate URL scheme before opening — prevent file:// or data: exploitation
  const safe = /^https?:\/\//.test(url);
  if (safe) shell.openExternal(url);
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('show-open-dialog', (_, opts) =>
  dialog.showOpenDialog(getMainWindow(), opts)
);

ipcMain.handle('check-for-updates', () => {
  if (app.isPackaged) getAutoUpdater().checkForUpdates();
});

ipcMain.handle('quit-and-install', () => {
  isQuitting = true;
  getAutoUpdater().quitAndInstall();
});

// ─── Session monitoring (heartbeat, network, clock-out) ─────────────────────

async function getAccessToken() {
  if (isRendererAvailable()) {
    try {
      const token = await getMainWindow().webContents.executeJavaScript(
        'localStorage.getItem("accessToken")'
      );
      if (token) {
        cachedAccessToken = token;
        return token;
      }
    } catch {
      /* webContents may be mid-teardown — fall back to cache */
    }
  }
  return cachedAccessToken;
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

/**
 * Server already ended the session. Sync Electron state without calling clock-out again.
 * @param {string} stopReason
 * @param {{ notify?: boolean }} opts — notify=false when alert was already sent server-side
 */
async function syncLocalSessionEnded(stopReason = 'shift_ended', { notify = false } = {}) {
  if (!currentSessionId) return;
  stopScreenshotScheduler();
  stopHeartbeat();
  currentSessionId = 0;
  screenshotIntervalMs = 0;
  setMonitoringState('off');
  sendToRenderer('cms:session-ended', { stopReason, silent: !notify });
  if (notify) {
    showNativeSessionNotification(stopReason);
  }
}

async function sendHeartbeat() {
  if (isQuitting || !currentSessionId) return;
  const token = await getAccessToken();
  if (!token) return;

  const url = `${resolveApiBaseUrl()}/api/work-sessions/heartbeat`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(HEARTBEAT_FETCH_TIMEOUT_MS),
    });
    if (res.ok) {
      let data = null;
      try {
        data = await res.json();
      } catch {
        /* ignore parse errors */
      }
      if (data && !data.session) {
        const reason = data.stopReason || 'shift_ended';
        console.warn('[heartbeat] no active session on server — syncing local state', reason);
        // Always surface OS notification for auto pauses so employees see *why*.
        await syncLocalSessionEnded(reason, { notify: true });
      }
      return;
    }
    if (res.status === 401) {
      // Token may be refreshing in the renderer — do not auto clock-out.
      console.warn('[heartbeat] unauthorized — waiting for renderer token refresh');
      return;
    }
    console.warn('[heartbeat] non-OK response:', res.status);
  } catch (err) {
    // Network blip or backend restart — session stays active; server stale job decides later.
    console.warn('[heartbeat] failed:', err.message);
  }
}

function startHeartbeat() {
  stopHeartbeat();
  if (!currentSessionId) return;
  void sendHeartbeat();
  heartbeatTimer = setInterval(() => {
    sendHeartbeat().catch((err) =>
      console.warn('[heartbeat] interval error:', err.message)
    );
  }, HEARTBEAT_INTERVAL_MS);
}

function stopSessionMonitoring() {
  stopHeartbeat();
}

async function clockOutFromMain(stopReason, { attemptApi = true } = {}) {
  if (!DEFINITIVE_LOCAL_STOP_REASONS.has(stopReason)) {
    console.warn('[clock-out] ignored non-definitive stop reason from main:', stopReason);
    return;
  }
  if (clockOutPromise) return clockOutPromise;

  clockOutPromise = (async () => {
    const hadSession = currentSessionId > 0;
    stopScreenshotScheduler();
    stopSessionMonitoring();
    currentSessionId = 0;
    screenshotIntervalMs = 0;
    setMonitoringState('off');

    if (hadSession && attemptApi) {
      const token = await getAccessToken();
      if (token) {
        const url = `${resolveApiBaseUrl()}/api/work-sessions/clock-out`;
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ stopReason }),
            signal: AbortSignal.timeout(CLOCK_OUT_TIMEOUT_MS),
          });
          if (res.ok || res.status === 200) {
            /* session ended on server */
          }
        } catch (err) {
          console.warn('[clock-out] main process failed:', err.message);
        }
      }
    }

    if (isRendererAvailable()) {
      sendToRenderer('cms:session-ended', { stopReason });
    }
    if (!isQuitting) {
      showNativeSessionNotification(stopReason);
    }
  })();

  try {
    await clockOutPromise;
  } finally {
    clockOutPromise = null;
  }
}

function registerPowerMonitorHandlers() {
  if (powerMonitorRegistered) return;
  powerMonitorRegistered = true;

  powerMonitor.on('suspend', () => {
    console.log('[power] system suspending — clocking out');
    // Remember that sleep interrupted work so resume can auto clock-in.
    // Without this, employees often stay clocked out for 1–2 hours after waking.
    resumeShouldClockIn = currentSessionId > 0;
    lastPowerStopReason = 'system_sleep';
    clockOutFromMain('system_sleep').catch((err) =>
      console.error('[power] suspend clock-out failed:', err.message)
    );
  });

  powerMonitor.on('shutdown', () => {
    console.log('[power] system shutting down — clocking out');
    resumeShouldClockIn = currentSessionId > 0;
    lastPowerStopReason = 'system_shutdown';
    clockOutFromMain('system_shutdown').catch((err) =>
      console.error('[power] shutdown clock-out failed:', err.message)
    );
  });

  powerMonitor.on('resume', () => {
    console.log('[power] system resumed — shouldClockIn=', resumeShouldClockIn);
    if (!resumeShouldClockIn) return;
    const previousStopReason = lastPowerStopReason || 'system_sleep';
    resumeShouldClockIn = false;
    showNativeSessionNotification('system_resumed');
    focusMainWindow();
    sendToRenderer('cms:system-resumed', {
      shouldClockIn: true,
      previousStopReason,
    });
  });
}

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
  sendToRenderer('cms:monitoring-state', state);
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
  if (isQuitting || isGracefulQuitInitiated) return;
  if (!getMainWindow()) return;

  if (powerMonitor.getSystemIdleTime() > IDLE_THRESHOLD_SECONDS) {
    console.log('[screenshot] skipped — user idle');
    return;
  }

  let shouldBlur = false;
  let foregroundLabel = '';
  if (blurSensitiveAppsEnabled) {
    const preCheck = await detectSensitiveBeforeCapture(isSensitiveForegroundApp, {
      samples: 3,
      gapMs: 70,
    });
    shouldBlur = preCheck.shouldBlur;
    foregroundLabel = formatForegroundLabel(preCheck.window);
    if (shouldBlur) {
      console.log(
        `[screenshot] sensitive app (${preCheck.phase}) — will blur:`,
        foregroundLabel
      );
    }
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

  let buffer = primary.thumbnail.toPNG();

  // Re-check after capture — user may have opened WhatsApp/Gmail during getSources().
  if (blurSensitiveAppsEnabled && !shouldBlur) {
    const postWindow = await getForegroundWindow();
    if (isSensitiveForegroundApp(postWindow)) {
      shouldBlur = true;
      foregroundLabel = formatForegroundLabel(postWindow);
      console.log(
        '[screenshot] sensitive app (post-capture) — will blur:',
        foregroundLabel
      );
    }
  }

  if (shouldBlur) {
    buffer = await applyFullBlur(buffer);
    console.log('[screenshot] full blur applied:', foregroundLabel);
  }

  let token = await getAccessToken();
  if (!token) {
    console.warn('[screenshot] no access token — user not logged in');
    return;
  }

  const uploadUrl = `${resolveApiBaseUrl()}/api/screenshots`;
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
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${uploadUrl}`);
      console.log('[screenshot] uploaded successfully');
      return;
    } catch (err) {
      if (attempt < 2) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[screenshot] attempt ${attempt + 1} failed (${err.message}), retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        // Window may have been closed while we were waiting — abort remaining retries.
        if (!getMainWindow()) break;
      } else {
        console.error(`[screenshot] all upload attempts failed: ${err.message}`);
      }
    }
  }
}

ipcMain.on('cms:show-session-notification', (_, payload = {}) => {
  const stopReason = payload.stopReason || 'shift_ended';
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  if (title && body) {
    showNativeSessionNotification(stopReason, { title, body });
  } else {
    showNativeSessionNotification(stopReason);
  }
});

ipcMain.on('cms:screenshot-config', (_, { enabled, intervalMs, sessionId, apiBaseUrl, blurSensitiveApps, accessToken }) => {
  if (apiBaseUrl) {
    runtimeApiBaseUrl = String(apiBaseUrl).replace(/\/+$/, '');
  }
  if (typeof accessToken === 'string' && accessToken.trim()) {
    cachedAccessToken = accessToken.trim();
  }
  if (!sessionId) {
    cachedAccessToken = null;
  }
  blurSensitiveAppsEnabled = Boolean(blurSensitiveApps);
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

  if (currentSessionId > 0) {
    clockOutPromise = null;
    registerPowerMonitorHandlers();
    startHeartbeat();
  } else {
    stopSessionMonitoring();
  }

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
// Main process clocks out directly — do not rely on renderer IPC during quit.
ipcMain.on('cms:clock-out-done', () => {
  isQuitReady = true;
  stopScreenshotScheduler();
  stopSessionMonitoring();
  app.quit();
});

async function initiateGracefulQuit() {
  if (isQuitReady) return;
  if (quitInProgress) {
    await quitInProgress;
    return;
  }

  quitInProgress = (async () => {
    isGracefulQuitInitiated = true;
    isQuitting = true;

    stopScreenshotScheduler();
    stopSessionMonitoring();

    if (currentSessionId > 0) {
      await clockOutFromMain('app_quit');
    }

    isQuitReady = true;
    app.quit();
  })();

  await quitInProgress;
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
    updater.on('update-available', (info) => {
      sendToRenderer('update-available', info);
    });
    updater.on('update-downloaded', (info) => {
      sendToRenderer('update-downloaded', info);
    });
    updater.checkForUpdatesAndNotify();
  }
});

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

// Industry default: quit when all windows close (Windows/Linux).
// macOS keeps the app alive until explicit Cmd+Q — activate recreates the window.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (e) => {
  isQuitting = true;
  destroyTray();
  if (!isQuitReady) {
    e.preventDefault();
    initiateGracefulQuit();
  }
});

// macOS: clicking the Dock icon re-shows the window
app.on('activate', () => {
  focusMainWindow();
});
