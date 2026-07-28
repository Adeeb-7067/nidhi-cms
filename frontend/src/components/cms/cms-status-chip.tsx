import { cn } from "@/lib/utils";

export type CmsStatusTone =
  | "neutral"
  | "info"
  | "warning"
  | "danger"
  | "success"
  | "accent"
  | "muted";

/** Semantic chip colors — one map for the whole CMS. */
export const cmsStatusToneClass: Record<CmsStatusTone, string> = {
  neutral: "bg-slate-500/10 text-slate-700 border-slate-500/25 dark:text-slate-300",
  info: "bg-blue-500/10 text-blue-700 border-blue-500/25 dark:text-blue-300",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-300",
  accent: "bg-violet-500/10 text-violet-700 border-violet-500/25 dark:text-violet-300",
  muted: "bg-muted text-muted-foreground border-border/60",
};

export const cmsStatusDotClass: Record<CmsStatusTone, string> = {
  neutral: "bg-slate-500",
  info: "bg-blue-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  success: "bg-emerald-500",
  accent: "bg-violet-500",
  muted: "bg-muted-foreground",
};

/**
 * Compact status / priority chip for tables and filters.
 * Prefer this over ad-hoc rounded-full spans in list pages.
 */
export function CmsStatusChip({
  label,
  tone = "neutral",
  /** Extra Tailwind for domain-specific color maps that already encode tone. */
  colorClassName,
  dot = false,
  className,
}: {
  label: string;
  tone?: CmsStatusTone;
  colorClassName?: string;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0 text-[10px] font-medium leading-5 whitespace-nowrap",
        colorClassName ?? cmsStatusToneClass[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cmsStatusDotClass[tone])}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

export type CmsStatusRegistryEntry = {
  label: string;
  tone?: CmsStatusTone;
  /** When set, used instead of tone (keeps existing domain color maps). */
  className?: string;
};

/** Build a typed status chip renderer from a domain enum map. */
export function createStatusChip<T extends string>(
  registry: Record<T, CmsStatusRegistryEntry>,
  defaults?: { dot?: boolean },
) {
  return function DomainStatusChip({
    value,
    className,
  }: {
    value: T | string;
    className?: string;
  }) {
    const entry = registry[value as T];
    return (
      <CmsStatusChip
        label={entry?.label ?? String(value)}
        tone={entry?.tone ?? "muted"}
        colorClassName={entry?.className}
        dot={defaults?.dot}
        className={className}
      />
    );
  };
}
