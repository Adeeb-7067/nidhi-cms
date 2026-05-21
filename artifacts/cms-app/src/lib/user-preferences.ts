/** Per-user preferences stored in localStorage (SaaS-style workspace prefs) */

export type NotificationPrefs = {
  emailAlerts: boolean;
  pushAlerts: boolean;
  bugUpdates: boolean;
  ticketUpdates: boolean;
  projectDigest: boolean;
};

export type WorkspacePrefs = {
  timezone: string;
  dateFormat: "mdy" | "dmy" | "ymd";
  language: string;
  compactNav: boolean;
};

const NOTIF_KEY = "nexus-prefs-notifications";
const WORKSPACE_KEY = "nexus-prefs-workspace";

const defaultNotif: NotificationPrefs = {
  emailAlerts: true,
  pushAlerts: true,
  bugUpdates: true,
  ticketUpdates: true,
  projectDigest: false,
};

const defaultWorkspace: WorkspacePrefs = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dateFormat: "mdy",
  language: "en",
  compactNav: false,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function getNotificationPrefs(): NotificationPrefs {
  return read(NOTIF_KEY, defaultNotif);
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  write(NOTIF_KEY, prefs);
}

export function getWorkspacePrefs(): WorkspacePrefs {
  return read(WORKSPACE_KEY, defaultWorkspace);
}

export function saveWorkspacePrefs(prefs: WorkspacePrefs): void {
  write(WORKSPACE_KEY, prefs);
}
