export type SettingsSectionId =
  | "appearance"
  | "notifications"
  | "workspace"
  | "account"
  | "organization"
  | "integrations"
  | "security"
  | "monitoring";

const STORAGE_KEY = "cms:settings:active-section";

/** Path for a settings tab — works with wouter hash routing (#/settings/monitoring). */
export function settingsSectionPath(id: SettingsSectionId): string {
  return `/settings/${id}`;
}

export function parseSettingsSectionFromLocation(location: string): SettingsSectionId | null {
  const path = location.split("?")[0]?.split("#")[0] ?? location;
  const match = path.match(/^\/settings\/([^/]+)$/);
  return match ? (match[1] as SettingsSectionId) : null;
}

export function persistSettingsSection(id: SettingsSectionId): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPersistedSettingsSection(): SettingsSectionId | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? (stored as SettingsSectionId) : null;
  } catch {
    return null;
  }
}

export const ADMIN_SETTINGS_SECTIONS: SettingsSectionId[] = [
  "appearance",
  "notifications",
  "workspace",
  "account",
  "security",
  "organization",
  "monitoring",
  "integrations",
];

export const USER_SETTINGS_SECTIONS: SettingsSectionId[] = [
  "appearance",
  "notifications",
  "workspace",
  "account",
  "security",
];

export function resolveSettingsSection(
  location: string,
  isAdmin: boolean,
): SettingsSectionId {
  const allowed = isAdmin ? ADMIN_SETTINGS_SECTIONS : USER_SETTINGS_SECTIONS;
  const fromPath = parseSettingsSectionFromLocation(location);
  if (fromPath && allowed.includes(fromPath)) return fromPath;

  const stored = readPersistedSettingsSection();
  if (stored && allowed.includes(stored)) return stored;

  return "appearance";
}
