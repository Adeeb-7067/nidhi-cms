import React, { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataPagination, type DataPaginationProps } from "@/components/ui/data-pagination";
import { DataViewToggle } from "@/components/ui/data-view-toggle";
import { PageTableSkeleton } from "@/components/loading";
import { CmsEmptyState, CmsErrorState } from "@/components/cms/cms-empty-state";
import { CmsFilterBar, type CmsSelectFilter } from "@/components/cms/cms-filter-bar";
import { useDataViewMode } from "@/lib/data-view";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Download, Inbox, Search, SlidersHorizontal } from "lucide-react";

/** Virtualize table body once row count exceeds this (keeps small pages simple). */
const VIRTUALIZE_ROW_THRESHOLD = 40;
const ESTIMATED_ROW_HEIGHT = 40;

export type CmsColumnAlign = "left" | "right" | "center";

export type CmsColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: CmsColumnAlign;
  className?: string;
  headerClassName?: string;
  /** Mark status/priority columns so the table can keep chip cells visually tight. */
  chip?: boolean;
  /** Plain label for the Columns menu (needed when header is a React node). */
  label?: string;
  /** Allow hiding via Columns menu. Default: true except id "actions". */
  hideable?: boolean;
  /** Start hidden when column toggle is enabled. */
  defaultHidden?: boolean;
  /** Hide from grid cards (still available in table when visible). */
  hideInGrid?: boolean;
};

export type CmsDataTableEmpty = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type CmsDataTableProps<T> = {
  columns: CmsColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  errorMessage?: string;
  empty?: CmsDataTableEmpty;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  pagination?: Omit<DataPaginationProps, "className">;
  loadingRows?: number;
  toolbar?: React.ReactNode;
  className?: string;
  /** Subtle zebra striping for dense money/legal tables */
  striped?: boolean;
  /** Nest inside an existing card/panel — drop outer border/shadow chrome. */
  embedded?: boolean;
  /**
   * Show table toolbar (view toggle, columns, optional search/filters).
   * Defaults to true when not embedded.
   */
  showToolbar?: boolean;
  /** Table ↔ grid switch. Defaults to showToolbar. */
  showViewToggle?: boolean;
  /** Columns picker. Defaults to showToolbar. */
  showColumnToggle?: boolean;
  /** Persist view mode + column visibility in localStorage. */
  viewStorageKey?: string;
  /** Initial view when nothing is stored yet. Defaults to table. */
  defaultViewMode?: "table" | "grid";
  /** Client-side search box — extracts text via getRowSearchText. */
  getRowSearchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Extra select filters rendered in the toolbar (does not invent page filters). */
  filters?: CmsSelectFilter[];
  onExport?: () => void;
  /** Custom grid card; default uses primary + secondary columns. */
  renderGridCard?: (row: T) => React.ReactNode;
  gridClassName?: string;
};

const alignClass: Record<CmsColumnAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const GRID_TONES = [
  "border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-background to-sky-50/30 dark:border-sky-800/40 dark:from-sky-950/35 dark:via-card dark:to-sky-950/10",
  "border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-background to-violet-50/30 dark:border-violet-800/40 dark:from-violet-950/35 dark:via-card dark:to-violet-950/10",
  "border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-background to-emerald-50/30 dark:border-emerald-800/40 dark:from-emerald-950/35 dark:via-card dark:to-emerald-950/10",
  "border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-background to-amber-50/30 dark:border-amber-800/40 dark:from-amber-950/30 dark:via-card dark:to-amber-950/10",
] as const;

function columnLabel<T>(col: CmsColumn<T>): string {
  if (col.label) return col.label;
  if (typeof col.header === "string" || typeof col.header === "number") return String(col.header);
  return col.id;
}

function isHideable<T>(col: CmsColumn<T>): boolean {
  if (col.hideable === false) return false;
  if (col.id === "actions") return false;
  return true;
}

function DefaultGridCard<T>({
  row,
  columns,
  onRowClick,
  toneIndex,
}: {
  row: T;
  columns: CmsColumn<T>[];
  onRowClick?: (row: T) => void;
  toneIndex: number;
}) {
  const primary =
    columns.find((c) => c.id !== "actions" && !c.hideInGrid) ?? columns[0];
  const bodyCols = columns.filter(
    (c) => c.id !== "actions" && c.id !== primary?.id && !c.hideInGrid,
  );
  const actionsCol = columns.find((c) => c.id === "actions");
  const tone = GRID_TONES[toneIndex % GRID_TONES.length];

  return (
    <Card
      className={cn(
        "overflow-hidden border shadow-sm transition-all duration-150",
        tone,
        onRowClick && "cursor-pointer hover:shadow-md hover:border-primary/30",
      )}
      onClick={() => onRowClick?.(row)}
    >
      {primary ? (
        <div className="border-b border-border/40 bg-background/50 px-3.5 py-3 dark:bg-black/10">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {columnLabel(primary)}
          </p>
          <div className="text-sm font-medium leading-snug">{primary.cell(row)}</div>
        </div>
      ) : null}
      <div className="space-y-2 px-3.5 py-3">
        {bodyCols.slice(0, 5).map((col) => (
          <div key={col.id} className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {columnLabel(col)}
            </p>
            <div className="mt-0.5 text-xs leading-snug">{col.cell(row)}</div>
          </div>
        ))}
        {actionsCol ? (
          <div
            className="pt-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {actionsCol.cell(row)}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function CmsTableRow<T>({
  row,
  index,
  columns,
  onRowClick,
  getRowClassName,
  striped,
}: {
  row: T;
  index: number;
  columns: CmsColumn<T>[];
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  striped: boolean;
}) {
  return (
    <TableRow
      onClick={onRowClick ? () => onRowClick(row) : undefined}
      className={cn(
        "border-b border-border/30 bg-background transition-colors last:border-0",
        onRowClick && "cursor-pointer",
        striped && index % 2 === 1 && "bg-muted/15",
        "hover:bg-muted/20",
        getRowClassName?.(row),
      )}
    >
      {columns.map((col) => (
        <TableCell
          key={col.id}
          className={cn(
            "px-2.5 py-1.5 align-middle text-xs text-foreground",
            alignClass[col.align ?? "left"],
            col.chip && "py-1",
            col.className,
          )}
        >
          <div
            className={cn(
              col.chip
                ? "flex flex-wrap items-center gap-1"
                : "min-w-0 leading-snug",
              col.align === "right" && "justify-end",
              col.align === "center" && "justify-center",
            )}
          >
            {col.cell(row)}
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
}

function CmsVirtualTableBody<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  getRowClassName,
  striped,
}: {
  rows: T[];
  columns: CmsColumn<T>[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  striped: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 10,
  });
  const items = virtualizer.getVirtualItems();
  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0
      ? virtualizer.getTotalSize() - items[items.length - 1].end
      : 0;

  return (
    <div
      ref={scrollRef}
      className="max-h-[min(70vh,640px)] overflow-auto"
      data-cms-virtual-table=""
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/70 [&_tr]:border-border/60">
          <TableRow className="border-b hover:bg-muted/70">
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className={cn(
                  "h-8 bg-muted/70 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                  alignClass[col.align ?? "left"],
                  col.headerClassName,
                  col.className,
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="bg-background">
          {paddingTop > 0 ? (
            <TableRow aria-hidden className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="p-0"
                style={{ height: paddingTop }}
              />
            </TableRow>
          ) : null}
          {items.map((item) => {
            const row = rows[item.index];
            return (
              <CmsTableRow
                key={rowKey(row)}
                row={row}
                index={item.index}
                columns={columns}
                onRowClick={onRowClick}
                getRowClassName={getRowClassName}
                striped={striped}
              />
            );
          })}
          {paddingBottom > 0 ? (
            <TableRow aria-hidden className="hover:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="p-0"
                style={{ height: paddingBottom }}
              />
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Polished CMS list table: card shell, chip-friendly cells, empty/error/loading,
 * optional pagination, table/grid toggle, and column visibility.
 * Does not invent pagination — only renders when provided.
 */
export function CmsDataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  onRetry,
  errorMessage,
  empty = { title: "No results found", description: "Adjust filters or try again." },
  onRowClick,
  getRowClassName,
  pagination,
  loadingRows = 8,
  toolbar,
  className,
  striped = false,
  embedded = false,
  showToolbar,
  showViewToggle,
  showColumnToggle,
  viewStorageKey,
  defaultViewMode = "table",
  getRowSearchText,
  searchPlaceholder = "Filter rows…",
  filters,
  onExport,
  renderGridCard,
  gridClassName = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3",
}: CmsDataTableProps<T>) {
  const isMobile = useMobileViewport();
  const toolbarEnabled = showToolbar ?? !embedded;
  const viewToggleEnabled = showViewToggle ?? toolbarEnabled;
  const columnToggleEnabled = showColumnToggle ?? toolbarEnabled;

  const resolvedStorageKey = useMemo(() => {
    if (viewStorageKey) return viewStorageKey;
    if (!toolbarEnabled) return undefined;
    return `auto:${columns.map((c) => c.id).join("|")}`;
  }, [viewStorageKey, toolbarEnabled, columns]);

  const [viewMode, setViewMode] = useDataViewMode(resolvedStorageKey, defaultViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const defaults = columns.reduce<Record<string, boolean>>((acc, col) => {
      acc[col.id] = !col.defaultHidden;
      return acc;
    }, {});
    const key = viewStorageKey ?? (toolbarEnabled ? `auto:${columns.map((c) => c.id).join("|")}` : undefined);
    if (key && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`cms-data-cols:${key}`);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, boolean>;
          return { ...defaults, ...parsed };
        }
      } catch {
        /* ignore */
      }
    }
    return defaults;
  });

  useEffect(() => {
    setVisibleColumns((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const col of columns) {
        if (!(col.id in next)) {
          next[col.id] = !col.defaultHidden;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [columns]);

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (resolvedStorageKey && typeof window !== "undefined") {
        localStorage.setItem(`cms-data-cols:${resolvedStorageKey}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const filteredRows = useMemo(() => {
    if (!getRowSearchText || !searchQuery.trim()) return rows;
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => getRowSearchText(row).toLowerCase().includes(q));
  }, [rows, searchQuery, getRowSearchText]);

  const activeColumns = useMemo(
    () => columns.filter((col) => visibleColumns[col.id] !== false),
    [columns, visibleColumns],
  );

  const gridColumns = useMemo(
    () => activeColumns.filter((col) => visibleColumns[col.id] !== false),
    [activeColumns, visibleColumns],
  );

  const effectiveViewMode = isMobile ? "table" : viewMode;

  const controls = toolbarEnabled ? (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {getRowSearchText ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 bg-background pl-8 text-xs"
            />
          </div>
        ) : null}
        {filters?.length ? (
          <CmsFilterBar
            className="rounded-lg border-border/50 bg-transparent p-0 shadow-none backdrop-blur-none"
            filters={filters}
          />
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {viewToggleEnabled && !isMobile ? (
          <DataViewToggle value={viewMode} onChange={setViewMode} />
        ) : null}
        {onExport ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        ) : null}
        {columnToggleEnabled && effectiveViewMode === "table" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Show columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.filter(isHideable).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns[col.id] !== false}
                  onCheckedChange={() => toggleColumn(col.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {columnLabel(col)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {toolbar}
        {controls}
        <PageTableSkeleton rows={loadingRows} columns={columns.length} showToolbar={false} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-3", className)}>
        {toolbar}
        {controls}
        <CmsErrorState message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <div className={cn(embedded ? "space-y-2" : "space-y-3", className)}>
        {toolbar}
        {controls}
        <CmsEmptyState
          icon={empty.icon ?? Inbox}
          title={empty.title}
          description={
            searchQuery.trim()
              ? "No rows match your filter. Try a different search."
              : empty.description
          }
          actionLabel={empty.actionLabel}
          onAction={empty.onAction}
        />
      </div>
    );
  }

  return (
    <div className={cn(embedded ? "space-y-1.5" : "space-y-2", className)}>
      {toolbar}
      {controls}

      {effectiveViewMode === "grid" ? (
        <div className={gridClassName}>
          {filteredRows.map((row, index) =>
            renderGridCard ? (
              <React.Fragment key={rowKey(row)}>{renderGridCard(row)}</React.Fragment>
            ) : (
              <DefaultGridCard
                key={rowKey(row)}
                row={row}
                columns={gridColumns}
                onRowClick={onRowClick}
                toneIndex={index}
              />
            ),
          )}
        </div>
      ) : filteredRows.length >= VIRTUALIZE_ROW_THRESHOLD ? (
        <div
          className={cn(
            "overflow-hidden",
            embedded ? null : "rounded-md border border-border/60 bg-card",
          )}
        >
          <CmsVirtualTableBody
            rows={filteredRows}
            columns={activeColumns}
            rowKey={rowKey}
            onRowClick={onRowClick}
            getRowClassName={getRowClassName}
            striped={striped}
          />
          {pagination && (
            <DataPagination
              {...pagination}
              className="rounded-none border-t border-border/40"
            />
          )}
        </div>
      ) : (
        <div
          className={cn(
            "overflow-hidden",
            embedded ? null : "rounded-md border border-border/60 bg-card",
          )}
        >
          <Table>
            <TableHeader className="bg-muted/70 [&_tr]:border-border/60">
              <TableRow className="border-b hover:bg-muted/70">
                {activeColumns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={cn(
                      "h-8 bg-muted/70 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                      alignClass[col.align ?? "left"],
                      col.headerClassName,
                      col.className,
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-background">
              {filteredRows.map((row, index) => (
                <CmsTableRow
                  key={rowKey(row)}
                  row={row}
                  index={index}
                  columns={activeColumns}
                  onRowClick={onRowClick}
                  getRowClassName={getRowClassName}
                  striped={striped}
                />
              ))}
            </TableBody>
          </Table>
          {pagination && (
            <DataPagination
              {...pagination}
              className="rounded-none border-t border-border/40"
            />
          )}
        </div>
      )}

      {effectiveViewMode === "grid" && pagination ? (
        <DataPagination {...pagination} className="rounded-md border border-border/40" />
      ) : null}
    </div>
  );
}
