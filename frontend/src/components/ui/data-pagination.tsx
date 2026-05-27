import React, { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  API_PAGE_LIMIT_CAP,
  DEFAULT_TABLE_PAGE_SIZE,
  PAGE_SIZE_ALL,
  PAGE_SIZE_ALL_SELECT_VALUE,
  TABLE_PAGE_SIZE_OPTIONS,
  getPaginationMeta,
  isShowAllPageSize,
  normalizePageLimit,
} from "@/lib/table-pagination";

export interface DataPaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: readonly number[];
  /** Rows currently rendered (avoids “1–N” when server “All” is capped below total). */
  loadedRowCount?: number;
  className?: string;
  hideWhenSinglePage?: boolean;
}

function buildPageList(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) pages.push(i);
  }

  if (current < totalPages - 2) pages.push("ellipsis");
  if (!pages.includes(totalPages)) pages.push(totalPages);

  return pages;
}

export function DataPagination({
  page,
  total,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  loadedRowCount,
  className,
  hideWhenSinglePage = false,
}: DataPaginationProps) {
  const { totalPages, safePage, start, end } = getPaginationMeta(
    total,
    page,
    limit,
    loadedRowCount,
  );

  const pageList = useMemo(
    () => buildPageList(safePage, totalPages),
    [safePage, totalPages],
  );

  const progressPct =
    totalPages > 0 ? Math.round((safePage / totalPages) * 100) : 0;

  const goTo = (next: number) => {
    if (totalPages < 1) return;
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (clamped !== safePage) onPageChange(clamped);
  };

  if (total === 0) return null;

  const showControls = totalPages > 1;
  if (hideWhenSinglePage && !showControls) return null;

  return (
    <nav
      aria-label="Table pagination"
      className={cn(
        "relative overflow-hidden border-t border-border/50",
        "bg-gradient-to-r from-muted/30 via-muted/15 to-muted/30",
        "px-3 py-3 sm:px-5 sm:py-3.5",
        className,
      )}
    >
      {/* subtle top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        aria-hidden
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Summary + progress */}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xs">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="inline-flex items-center rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground shadow-sm">
              {total} {total === 1 ? "row" : "rows"}
            </span>
            {onLimitChange && (
              <PageSizeSelect
                limit={limit}
                total={total}
                options={pageSizeOptions}
                onLimitChange={onLimitChange}
              />
            )}
            {showControls && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary ring-1 ring-primary/20">
                Page {safePage} / {totalPages}
              </span>
            )}
          </div>

          <p className="text-center text-xs leading-relaxed text-muted-foreground sm:text-left">
            Showing{" "}
            <span className="font-semibold tabular-nums text-foreground">{start}</span>
            <span className="mx-0.5 text-muted-foreground/50">–</span>
            <span className="font-semibold tabular-nums text-foreground">{end}</span>
          </p>

          {showControls && (
            <div className="hidden h-1 w-full overflow-hidden rounded-full bg-border/50 sm:block">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.max(progressPct, 8)}%` }}
                role="progressbar"
                aria-valuenow={safePage}
                aria-valuemin={1}
                aria-valuemax={totalPages}
                aria-label={`Page ${safePage} of ${totalPages}`}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        {showControls && (
          <div className="flex flex-col items-center gap-2 sm:items-end">
            {/* Mobile: compact prev / indicator / next */}
            <div className="flex w-full max-w-sm items-center justify-between gap-2 sm:hidden">
              <NavEdgeButton
                label="Previous page"
                onClick={() => goTo(safePage - 1)}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </NavEdgeButton>

              <div className="flex min-w-[5.5rem] flex-col items-center rounded-lg border border-border/60 bg-background/90 px-3 py-1.5 shadow-sm">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Page
                </span>
                <span className="text-sm font-bold tabular-nums text-foreground">
                  {safePage}
                  <span className="text-muted-foreground font-normal"> / {totalPages}</span>
                </span>
              </div>

              <NavEdgeButton
                label="Next page"
                onClick={() => goTo(safePage + 1)}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </NavEdgeButton>
            </div>

            {/* Desktop: full control strip */}
            <div
              className="hidden sm:flex sm:items-center sm:gap-1 sm:rounded-xl sm:border sm:border-border/60 sm:bg-background/70 sm:p-1 sm:shadow-sm sm:backdrop-blur-sm"
              role="group"
              aria-label="Page navigation"
            >
              <NavIconButton
                label="First page"
                onClick={() => goTo(1)}
                disabled={safePage <= 1}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </NavIconButton>
              <NavIconButton
                label="Previous page"
                onClick={() => goTo(safePage - 1)}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </NavIconButton>

              <div className="mx-0.5 flex items-center gap-0.5 px-0.5">
                {pageList.map((item, idx) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="flex h-8 w-7 items-center justify-center text-muted-foreground/70"
                      aria-hidden
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      aria-label={`Go to page ${item}`}
                      aria-current={item === safePage ? "page" : undefined}
                      onClick={() => goTo(item)}
                      className={cn(
                        "relative flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold tabular-nums transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
                        item === safePage
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}
              </div>

              <NavIconButton
                label="Next page"
                onClick={() => goTo(safePage + 1)}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </NavIconButton>
              <NavIconButton
                label="Last page"
                onClick={() => goTo(totalPages)}
                disabled={safePage >= totalPages}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </NavIconButton>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavIconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors",
        "hover:bg-muted/90 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:pointer-events-none disabled:opacity-35",
      )}
    >
      {children}
    </button>
  );
}

function PageSizeSelect({
  limit,
  total,
  options,
  onLimitChange,
}: {
  limit: number;
  total: number;
  options: readonly number[];
  onLimitChange: (limit: number) => void;
}) {
  const sizes = options.length > 0 ? options : TABLE_PAGE_SIZE_OPTIONS;
  const value = isShowAllPageSize(limit)
    ? PAGE_SIZE_ALL_SELECT_VALUE
    : String(normalizePageLimit(limit));

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">Rows</span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next === PAGE_SIZE_ALL_SELECT_VALUE) {
            onLimitChange(PAGE_SIZE_ALL);
            return;
          }
          const parsed = Number.parseInt(next, 10);
          if (!Number.isFinite(parsed)) return;
          onLimitChange(normalizePageLimit(parsed));
        }}
      >
        <SelectTrigger
          className="h-7 min-w-[4.25rem] w-auto border-border/60 bg-background/90 px-2 text-xs font-semibold tabular-nums shadow-sm"
          aria-label="Rows per page"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {sizes.map((size) => (
            <SelectItem key={size} value={String(size)} className="text-xs tabular-nums">
              {size}
            </SelectItem>
          ))}
          <SelectItem value={PAGE_SIZE_ALL_SELECT_VALUE} className="text-xs font-medium">
            All
            {total > 0
              ? total > API_PAGE_LIMIT_CAP
                ? ` (up to ${API_PAGE_LIMIT_CAP})`
                : ` (${total})`
              : ""}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function NavEdgeButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-11 shrink-0 p-0 border-border/60 bg-background/90 shadow-sm disabled:opacity-40"
    >
      {children}
    </Button>
  );
}
