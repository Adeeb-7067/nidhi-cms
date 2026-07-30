import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CmsKpiGrid, type CmsKpiAccent, type CmsKpiItem } from "@/components/cms/cms-kpi";

export type HrmRefKpiTone = "primary" | "info" | "success" | "warning" | "danger" | "purple";

const defaultTones: HrmRefKpiTone[] = ["primary", "info", "success", "warning", "purple"];

function toneFromAccent(accent?: string): HrmRefKpiTone | undefined {
  if (!accent) return undefined;
  if (accent === "green" || accent === "emerald") return "success";
  if (accent === "blue") return "info";
  if (accent === "amber") return "warning";
  if (accent === "rose") return "danger";
  if (accent === "violet") return "purple";
  return "primary";
}

/** Satyakabir PageHeader — plain title row, no hero card. */
export function HrmRefPageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div>
      )}
    </div>
  );
}

export function hrmRefCountSubtitle(count: number, singular: string, plural?: string) {
  const word = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${word} available`;
}

export function HrmRefRefreshButton({
  onClick,
  loading,
  className,
}: {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("h-8 gap-1.5", className)}
      onClick={onClick}
      disabled={loading}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
      Refresh
    </Button>
  );
}

export type HrmRefStatItem = {
  label: string;
  value: string | number;
  tone?: HrmRefKpiTone;
  valueClassName?: string;
};

function toneToCmsAccent(tone: HrmRefKpiTone): CmsKpiAccent {
  if (tone === "info") return "blue";
  if (tone === "success") return "green";
  if (tone === "warning") return "amber";
  if (tone === "danger") return "red";
  if (tone === "purple") return "violet";
  return "default";
}

/** Satyakabir StatStrip — shared CMS KPI kit for visual parity across the product. */
export function HrmRefStatStrip({
  stats,
  loading,
  columns = 4,
  className,
}: {
  stats: HrmRefStatItem[];
  loading?: boolean;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const gridCols = (columns === 5 ? 4 : columns) as 2 | 3 | 4;
  const items: CmsKpiItem[] = stats.map((s, i) => {
    const tone = s.tone ?? defaultTones[i % defaultTones.length];
    return {
      title: s.label,
      value: s.value,
      icon: BarChart3,
      accent: toneToCmsAccent(tone),
      alert: tone === "danger",
    };
  });
  return (
    <CmsKpiGrid
      items={items}
      loading={loading}
      columns={gridCols}
      count={Math.max(stats.length, gridCols)}
      className={className}
    />
  );
}

/** Map CMS HrmKpiItem accent to ref stat strip items. */
export function hrmKpiToRefStats(
  items: Array<{ label: string; value: string | number; accent?: string; hint?: string }>,
): HrmRefStatItem[] {
  return items.map((item, i) => ({
    label: item.label,
    value: item.value,
    tone: toneFromAccent(item.accent) ?? defaultTones[i % defaultTones.length],
    valueClassName:
      item.accent === "rose"
        ? "text-destructive"
        : item.accent === "green" || item.accent === "emerald"
          ? "text-green-600 dark:text-green-400"
          : item.accent === "violet"
            ? "text-purple-600 dark:text-purple-400"
            : item.accent === "amber"
              ? "text-amber-600 dark:text-amber-400"
              : undefined,
  }));
}

/** Master-detail card shell (policies, documents, etc.). */
export function HrmRefMasterDetail({
  listTitle,
  list,
  selectedId,
  onSelect,
  getId,
  renderListItem,
  detail,
  loading,
  emptyList,
  className,
}: {
  listTitle: string;
  list: unknown[];
  selectedId?: string | number | null;
  onSelect: (id: string | number) => void;
  getId: (item: unknown) => string | number;
  renderListItem: (item: unknown, active: boolean) => ReactNode;
  detail: ReactNode;
  loading?: boolean;
  emptyList?: ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
        <div className="flex min-h-[28rem] flex-col lg:flex-row">
          <aside className="w-full border-b border-border lg:w-80 lg:border-b-0 lg:border-r">
            <Skeleton className="m-4 h-6 w-24" />
            <div className="space-y-2 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="mx-2 h-14 rounded-lg" />
              ))}
            </div>
          </aside>
          <section className="flex-1 p-6">
            <Skeleton className="mb-4 h-8 w-2/3" />
            <Skeleton className="h-[22rem] w-full rounded-xl" />
          </section>
        </div>
      </Card>
    );
  }

  if (!list.length && emptyList) {
    return <>{emptyList}</>;
  }

  return (
    <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
      <div className="flex min-h-[calc(100dvh-14rem)] flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-border bg-card lg:w-80 lg:max-w-[20rem] lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{listTitle}</p>
          </div>
          <ul className="max-h-64 overflow-y-auto lg:max-h-[calc(100dvh-16rem)]">
            {list.map((item) => {
              const id = getId(item);
              const active = selectedId === id;
              return (
                <li key={String(id)}>
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    className={cn(
                      "flex w-full border-r-4 text-left transition-colors",
                      active ? "border-r-primary bg-primary/8" : "border-r-transparent hover:bg-muted/50",
                    )}
                  >
                    {renderListItem(item, active)}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">{detail}</section>
      </div>
    </Card>
  );
}

export function HrmRefListItemContent({
  icon: Icon,
  title,
  subtitle,
  active,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  active?: boolean;
}) {
  return (
    <span className="flex w-full items-start gap-2.5 px-4 py-3">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 text-muted-foreground",
        )}
      >
        <Icon className="size-3" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug text-foreground">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[11px] capitalize text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}

export function HrmRefDetailHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-border px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
          {children}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function HrmRefDetailSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      )}
      <div className="rounded-xl border border-border/60 bg-muted/10 p-4">{children}</div>
    </div>
  );
}

export function HrmRefDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground sm:text-right">{value}</span>
    </div>
  );
}

export function HrmRefStatusPill({
  tone = "muted",
  children,
}: {
  tone?: "success" | "warning" | "danger" | "info" | "muted";
  children: ReactNode;
}) {
  const cls =
    tone === "success"
      ? "bg-green-500/10 text-green-700 dark:text-green-400"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : tone === "danger"
          ? "bg-destructive/10 text-destructive"
          : tone === "info"
            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
            : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", cls)}>
      {children}
    </Badge>
  );
}

export function HrmRefEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-20 px-6">
      <Icon className="size-10 text-muted-foreground" strokeWidth={1.5} />
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 max-w-md text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function HrmRefPdfPanel({
  fileUrl,
  title,
  emptyTitle = "PDF not uploaded yet",
  emptyDescription = "An administrator can attach the document from the edit dialog.",
  emptyAction,
}: {
  fileUrl?: string | null;
  title: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  const [probe, setProbe] = useState<"idle" | "checking" | "ok" | "missing">("idle");

  useEffect(() => {
    if (!fileUrl) {
      setProbe("idle");
      return;
    }
    let cancelled = false;
    setProbe("checking");

    const check = async () => {
      try {
        // Prefer HEAD; some Spaces configs only allow GET publicly.
        let res = await fetch(fileUrl, { method: "HEAD", mode: "cors" });
        if (res.status === 405 || res.status === 403) {
          res = await fetch(fileUrl, {
            method: "GET",
            mode: "cors",
            headers: { Range: "bytes=0-0" },
          });
        }
        if (cancelled) return;
        if (res.status === 404) {
          setProbe("missing");
          return;
        }
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        // S3/Spaces NoSuchKey often returns 404 XML, or 200 XML on misconfigured proxies.
        if (ct.includes("xml") || ct.includes("text/html") || ct.includes("application/xml")) {
          setProbe("missing");
          return;
        }
        if (!res.ok) {
          setProbe("missing");
          return;
        }
        setProbe("ok");
      } catch {
        // CORS may block HEAD/GET from localhost against Spaces — still try iframe.
        if (!cancelled) setProbe("ok");
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (!fileUrl) {
    return (
      <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-6 py-10 text-center">
        <p className="text-sm font-medium">{emptyTitle}</p>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{emptyDescription}</p>
        {emptyAction && <div className="mt-5">{emptyAction}</div>}
      </div>
    );
  }

  if (probe === "checking") {
    return (
      <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/10 px-6 py-10">
        <Skeleton className="h-8 w-48" />
        <p className="mt-3 text-xs text-muted-foreground">Checking document…</p>
      </div>
    );
  }

  if (probe === "missing") {
    return (
      <div className="flex min-h-[22rem] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-6 py-10 text-center">
        <p className="text-sm font-medium">Document file is missing from storage</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          The kit item still has a file link, but the PDF is not in the bucket (deleted, never uploaded, or wrong key).
          Re-upload the document from Edit.
        </p>
        {emptyAction && <div className="mt-5">{emptyAction}</div>}
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-muted-foreground hover:underline"
        >
          Open stored URL anyway
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[22rem] flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-muted/10">
      <iframe title={title} src={fileUrl} className="min-h-[22rem] w-full flex-1 border-0 bg-background" />
      <div className="border-t border-border/60 px-4 py-2 text-right">
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-primary hover:underline"
        >
          Open in new tab
        </a>
      </div>
    </div>
  );
}
