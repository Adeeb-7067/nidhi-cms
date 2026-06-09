import type { ApkReleaseAudience, ApkReleaseInput } from "@/api";

export const APK_AUDIENCE_VALUES = [
  "team_only",
  "client_visible",
  "all_visible",
] as const satisfies readonly ApkReleaseAudience[];

export const APK_AUDIENCE_OPTIONS: {
  value: ApkReleaseAudience;
  label: string;
  description: string;
}[] = [
  {
    value: "team_only",
    label: "Team only",
    description: "Developers and QA only. Hidden from the client portal.",
  },
  {
    value: "client_visible",
    label: "Clients",
    description: "Visible to assigned clients and your internal team.",
  },
  {
    value: "all_visible",
    label: "Visible to all",
    description: "Shown to everyone with project access, including all clients.",
  },
];

export const CLIENT_PORTAL_APK_AUDIENCES = new Set<ApkReleaseAudience>([
  "client_visible",
  "all_visible",
]);

export function isClientPortalApkRelease(audience: ApkReleaseAudience | string): boolean {
  return CLIENT_PORTAL_APK_AUDIENCES.has(audience as ApkReleaseAudience);
}

export function isValidApkAudience(value: unknown): value is ApkReleaseAudience {
  return (
    typeof value === "string" &&
    (APK_AUDIENCE_VALUES as readonly string[]).includes(value)
  );
}

export function getApkAudienceLabel(audience: ApkReleaseAudience | string): string {
  const match = APK_AUDIENCE_OPTIONS.find((o) => o.value === audience);
  if (match) return match.label;
  return String(audience).replace(/_/g, " ");
}

export function getApkAudienceBadgeClass(audience: ApkReleaseAudience | string): string {
  switch (audience) {
    case "team_only":
      return "bg-slate-500/10 text-slate-500 border-slate-500/50";
    case "client_visible":
      return "bg-primary/10 text-primary border-primary/50";
    case "all_visible":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/50";
    default:
      return "";
  }
}

export function resolveApkDisplayName(release: {
  displayName?: string | null;
  customName?: string | null;
  name?: string | null;
  version?: string;
}): string {
  const display = release.displayName?.trim();
  if (display) return display;
  const custom = release.customName?.trim();
  if (custom) return custom;
  const legacy = release.name?.trim();
  if (legacy) return legacy;
  if (release.version) return `Build v${release.version}`;
  return "Untitled release";
}

/** Secondary line under title (version / build). */
export function formatApkReleaseSubtitle(release: {
  version?: string;
  buildNumber?: number;
  platform?: string;
}): string {
  const parts: string[] = [];
  if (release.version) parts.push(`v${release.version}`);
  if (release.buildNumber != null) parts.push(`build ${release.buildNumber}`);
  if (release.platform) parts.push(release.platform);
  return parts.join(" · ");
}

/** Normalize upload form values before POST. */
export function toApkReleaseInput(values: {
  name: string;
  version: string;
  buildNumber?: number;
  releaseType: ApkReleaseInput["releaseType"];
  platform: ApkReleaseInput["platform"];
  audience: ApkReleaseAudience;
  changelog?: string;
  fileUrl: string;
  minOsVersion?: string;
}): ApkReleaseInput {
  const buildNumber =
    typeof values.buildNumber === "number" &&
    Number.isFinite(values.buildNumber) &&
    values.buildNumber > 0
      ? values.buildNumber
      : undefined;

  return {
    name: values.name.trim(),
    version: values.version.trim(),
    buildNumber,
    releaseType: values.releaseType,
    platform: values.platform,
    audience: values.audience,
    fileUrl: values.fileUrl,
    changelog: values.changelog?.trim() || undefined,
    minOsVersion: values.minOsVersion?.trim() || undefined,
  };
}
