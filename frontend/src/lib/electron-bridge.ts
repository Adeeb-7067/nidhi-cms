declare global {
  interface Window {
    electron?: {
      platform: string;
      openExternal: (url: string) => Promise<void>;
      getAppVersion: () => Promise<string>;
      showOpenDialog: (opts: {
        title?: string;
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
        properties?: string[];
      }) => Promise<{ canceled: boolean; filePaths: string[] }>;
      checkForUpdates: () => Promise<void>;
      quitAndInstall: () => void;
      onUpdateAvailable: (cb: (info: { version: string }) => void) => () => void;
      onUpdateDownloaded: (cb: (info: { version: string }) => void) => () => void;
      setScreenshotConfig: (cfg: {
        enabled: boolean;
        intervalMs: number;
        sessionId?: number;
        apiBaseUrl?: string;
        blurSensitiveApps?: boolean;
        accessToken?: string;
      }) => void;
      pauseScreenshotMonitoring: (durationMs: number) => void;
      onMonitoringStateChange: (cb: (state: string) => void) => () => void;
      notifyClockOutDone: () => void;
      onPreQuit: (cb: () => Promise<void>) => () => void;
      onSessionEnded: (cb: (payload: { stopReason: string; silent?: boolean }) => void) => () => void;
    };
  }
}

/** Returns true when the app is running inside an Electron shell. */
export const isElectron = (): boolean =>
  typeof window !== 'undefined' && typeof window.electron !== 'undefined';

/**
 * Opens a URL in the user's default OS browser.
 * Falls back to window.open when not in Electron.
 */
export const openExternal = (url: string): void => {
  if (isElectron()) {
    void window.electron!.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/** Returns the packaged app version, or null outside Electron. */
export const getAppVersion = async (): Promise<string | null> => {
  if (!isElectron()) return null;
  return window.electron!.getAppVersion();
};

/**
 * Returns the query string for the current page, regardless of routing mode.
 *
 * In standard browser routing: window.location.search → "?key=val"
 * In Electron hash routing:    window.location.search is "" because the full
 * route lives in the hash: "#/path?key=val". This reads from the hash instead.
 */
export function getLocationSearch(): string {
  if (typeof window === 'undefined') return '';
  if (window.location.search) return window.location.search;
  const qi = window.location.hash.indexOf('?');
  return qi >= 0 ? window.location.hash.slice(qi) : '';
}

/**
 * Removes a single query param from the current URL without a page reload,
 * accounting for both standard and hash-based routing.
 */
export function clearLocationParam(key: string): void {
  if (typeof window === 'undefined') return;

  if (window.location.search) {
    // Standard routing — param lives in window.location.search
    const url = new URL(window.location.href);
    if (!url.searchParams.has(key)) return;
    url.searchParams.delete(key);
    window.history.replaceState({}, '', url.pathname + (url.search || ''));
  } else {
    // Hash routing (Electron) — param lives inside the hash fragment
    const hash = window.location.hash; // e.g. "#/dev/bugs?bug=5"
    const qi = hash.indexOf('?');
    if (qi < 0) return;
    const hashPath = hash.slice(0, qi);           // "#/dev/bugs"
    const params = new URLSearchParams(hash.slice(qi + 1));
    if (!params.has(key)) return;
    params.delete(key);
    const newHash = params.toString() ? `${hashPath}?${params.toString()}` : hashPath;
    window.history.replaceState({}, '', window.location.pathname + newHash);
  }
}
