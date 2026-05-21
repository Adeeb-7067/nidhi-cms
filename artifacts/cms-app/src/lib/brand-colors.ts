/** Accent colors from the Satya Kabir logo + one user-defined custom color. */

export const BRAND_LOGO_COLORS = {
  "brand-blue": {
    label: "Brand Blue",
    hex: "#4285F4",
    hsl: "217 89% 61%",
    hslDark: "217 89% 66%",
  },
  "brand-green": {
    label: "Brand Green",
    hex: "#34A853",
    hsl: "142 61% 45%",
    hslDark: "142 61% 52%",
  },
  "brand-red": {
    label: "Brand Red",
    hex: "#EA4335",
    hsl: "4 82% 56%",
    hslDark: "4 82% 62%",
  },
  "brand-yellow": {
    label: "Brand Yellow",
    hex: "#FBBC05",
    hsl: "45 97% 50%",
    hslDark: "45 97% 55%",
  },
} as const;

export type BrandLogoColorKey = keyof typeof BRAND_LOGO_COLORS;

export type PrimaryColor = BrandLogoColorKey | "custom";

export const DEFAULT_CUSTOM_COLOR = "#8B5CF6";

export const COLOR_PRESETS: { label: string; value: PrimaryColor; swatch: string }[] = [
  ...Object.entries(BRAND_LOGO_COLORS).map(([value, color]) => ({
    label: color.label,
    value: value as BrandLogoColorKey,
    swatch: color.hex,
  })),
  { label: "Custom", value: "custom", swatch: DEFAULT_CUSTOM_COLOR },
];

const LEGACY_PRIMARY_MAP: Record<string, PrimaryColor> = {
  default: "brand-blue",
  blue: "brand-blue",
  green: "brand-green",
  purple: "custom",
  orange: "brand-yellow",
  rose: "brand-red",
};

export function normalizePrimaryColor(stored: string | null): PrimaryColor {
  if (!stored) return "brand-blue";
  if (stored in BRAND_LOGO_COLORS || stored === "custom") return stored as PrimaryColor;
  return LEGACY_PRIMARY_MAP[stored] ?? "brand-blue";
}

/** Convert #RRGGBB to space-separated H S% L% for CSS variables. */
export function hexToHslChannels(hex: string): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return "217 89% 61%";

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / delta + 2) / 6;
        break;
      default:
        h = ((r - g) / delta + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyAccentVariables(root: HTMLElement, hsl: string, isDark: boolean): void {
  const channels = hsl.includes("%") ? hsl : hexToHslChannels(hsl);
  const parts = channels.split(" ");
  const h = parts[0];
  const s = parts[1];
  const lNum = Number.parseInt(parts[2] ?? "50", 10);
  const primaryL = isDark ? Math.min(lNum + 6, 72) : lNum;

  const primary = `${h} ${s} ${primaryL}%`;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--accent", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-ring", primary);
  root.style.setProperty("--chart-1", primary);
}

export function clearAccentVariables(root: HTMLElement): void {
  for (const key of [
    "--primary",
    "--ring",
    "--accent",
    "--sidebar-primary",
    "--sidebar-ring",
    "--chart-1",
  ]) {
    root.style.removeProperty(key);
  }
}
