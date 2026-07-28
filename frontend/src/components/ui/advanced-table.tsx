import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./table";
import { Button } from "./button";
import { Input } from "./input";
import { Card } from "./card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./dropdown-menu";
import { ChevronDown, ChevronRight, Download, SlidersHorizontal, Search, FileText, Table as TableIcon } from "lucide-react";
import { TableDetailPanel, getColumnDetailContent } from "./table-detail-panel";
import { createExportPdf, getColumnExportValue, runAutoTableExport } from "@/lib/pdf-export";
import { DataViewToggle } from "./data-view-toggle";
import { DataPagination } from "./data-pagination";
import { useDataViewMode, type DataViewMode } from "@/lib/data-view";
import { useMobileViewport } from "@/hooks/use-mobile-viewport";
import { cn } from "@/lib/utils";
import { effectivePageSize, type TablePaginationProps } from "@/lib/table-pagination";
import { PageTableSkeleton } from "@/components/loading";
import { CmsErrorState } from "@/components/cms/cms-empty-state";

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  /** Plain rendering for expanded detail / export when cell is compact */
  detailCell?: (item: T) => React.ReactNode;
  /** Plain text for CSV/PDF when cell/detailCell is React-only */
  exportValue?: (item: T) => string;
  /** Hide this field from the default grid card body */
  hideInGrid?: boolean;
  /** Hide from expanded detail panel */
  hideInDetail?: boolean;
  /** Only in expanded detail row and grid card (not main table columns) */
  detailOnly?: boolean;
  className?: string;
}

interface AdvancedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  filename?: string;
  /** Optional full dataset for CSV/PDF export when table view is paginated. */
  exportData?: T[];
  onRowClick?: (item: T) => void;
  /** Persist table/grid preference in localStorage */
  viewStorageKey?: string;
  defaultViewMode?: DataViewMode;
  showViewToggle?: boolean;
  renderGridCard?: (item: T) => React.ReactNode;
  gridClassName?: string;
  /** Expandable row with full field details (table view) */
  showRowDetails?: boolean;
  getRowClassName?: (item: T) => string | undefined;
  /** Server-driven pagination (data is already the current page) */
  pagination?: TablePaginationProps;
  /** Slice filtered rows client-side when the API returns the full list */
  clientPagination?: TablePaginationProps;
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  errorMessage?: string;
  loadingRows?: number;
}

/** Light tinted card backgrounds (cycles per row); dark mode uses muted equivalents */
const GRID_CARD_TONES = [
  "border-sky-200/80 bg-gradient-to-br from-sky-50 via-sky-50/40 to-white dark:border-sky-800/50 dark:from-sky-950/45 dark:via-card dark:to-sky-950/15",
  "border-violet-200/80 bg-gradient-to-br from-violet-50 via-violet-50/40 to-white dark:border-violet-800/50 dark:from-violet-950/45 dark:via-card dark:to-violet-950/15",
  "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white dark:border-emerald-800/50 dark:from-emerald-950/45 dark:via-card dark:to-emerald-950/15",
  "border-amber-200/80 bg-gradient-to-br from-amber-50 via-amber-50/30 to-white dark:border-amber-800/50 dark:from-amber-950/40 dark:via-card dark:to-amber-950/15",
  "border-rose-200/80 bg-gradient-to-br from-rose-50 via-rose-50/40 to-white dark:border-rose-800/50 dark:from-rose-950/45 dark:via-card dark:to-rose-950/15",
  "border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-cyan-50/40 to-white dark:border-cyan-800/50 dark:from-cyan-950/45 dark:via-card dark:to-cyan-950/15",
] as const;

function DefaultGridCard<T>({
  item,
  columns,
  onRowClick,
  toneIndex = 0,
}: {
  item: T;
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  toneIndex?: number;
}) {
  const primary =
    columns.find((c) => c.id !== "actions" && !c.hideInGrid && !c.detailOnly) ??
    columns.find((c) => c.id !== "actions" && !c.hideInGrid) ??
    columns[0];
  const bodyCols = columns.filter(
    (c) => c.id !== "actions" && c.id !== primary?.id && !c.hideInGrid,
  );
  const actionsCol = columns.find((c) => c.id === "actions");
  const tone = GRID_CARD_TONES[toneIndex % GRID_CARD_TONES.length];

  return (
    <Card
      className={cn(
        "overflow-hidden border shadow-sm transition-all duration-150",
        tone,
        onRowClick && "cursor-pointer hover:shadow-md hover:border-primary/30",
      )}
      onClick={() => onRowClick?.(item)}
    >
      {primary && (
        <div className="min-w-0 border-b border-border/40 bg-background/50 px-3.5 py-2.5 dark:bg-black/10">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {primary.header}
          </p>
          <div className="text-sm font-medium leading-snug">
            {primary.cell
              ? primary.cell(item)
              : primary.accessorKey
                ? String(item[primary.accessorKey] ?? "")
                : null}
          </div>
        </div>
      )}
      {bodyCols.length > 0 && (
        <dl className="space-y-1.5 px-3.5 py-2.5">
          {bodyCols.slice(0, 5).map((col) => (
            <div key={col.id} className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {col.header}
              </dt>
              <dd className="mt-0.5 text-xs leading-snug text-foreground">
                {getColumnDetailContent(col, item)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {actionsCol?.cell && (
        <div
          className="flex justify-end border-t border-border/40 bg-background/40 px-3 py-2 dark:bg-black/10"
          onClick={(e) => e.stopPropagation()}
        >
          {actionsCol.cell(item)}
        </div>
      )}
    </Card>
  );
}

export function AdvancedTable<T>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Search...",
  filename = "export",
  exportData,
  onRowClick,
  viewStorageKey,
  defaultViewMode = "table",
  showViewToggle = true,
  renderGridCard,
  gridClassName = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3",
  showRowDetails = true,
  getRowClassName,
  pagination,
  clientPagination,
  isLoading,
  error,
  onRetry,
  errorMessage,
  loadingRows = 8,
}: AdvancedTableProps<T>) {
  const [viewMode, setViewMode] = useDataViewMode(viewStorageKey, defaultViewMode);
  const isMobile = useMobileViewport();
  const effectiveViewMode: DataViewMode = isMobile ? "grid" : viewMode;
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const defaults = columns.reduce<Record<string, boolean>>(
      (acc, col) => ({ ...acc, [col.id]: true }),
      {},
    );
    if (viewStorageKey && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`cms-adv-cols:${viewStorageKey}`);
        if (raw) return { ...defaults, ...(JSON.parse(raw) as Record<string, boolean>) };
      } catch {
        /* ignore */
      }
    }
    return defaults;
  });

  useEffect(() => {
    setVisibleColumns((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const col of columns) {
        if (next[col.id] === undefined) {
          next[col.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [columns]);

  const filteredData = useMemo(() => {
    if (!searchQuery || !searchKey) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((item) => {
      const val = item[searchKey];
      if (typeof val === "string" || typeof val === "number") {
        return String(val).toLowerCase().includes(lowerQuery);
      }
      return false;
    });
  }, [data, searchQuery, searchKey]);

  const displayData = useMemo(() => {
    if (!clientPagination) return filteredData;
    const pageSize = effectivePageSize(clientPagination.limit, filteredData.length);
    const start = (clientPagination.page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, clientPagination]);

  const resolvedPagination = useMemo((): TablePaginationProps | undefined => {
    if (pagination) return pagination;
    if (clientPagination) {
      return {
        ...clientPagination,
        total: filteredData.length,
      };
    }
    return undefined;
  }, [pagination, clientPagination, filteredData.length]);

  useEffect(() => {
    if (!clientPagination) return;
    clientPagination.onPageChange(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!clientPagination) return;
    const pageSize = effectivePageSize(clientPagination.limit, filteredData.length);
    const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    if (clientPagination.page > totalPages) {
      clientPagination.onPageChange(totalPages);
    }
  }, [filteredData.length, clientPagination?.page, clientPagination?.limit]);

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (viewStorageKey && typeof window !== "undefined") {
        localStorage.setItem(`cms-adv-cols:${viewStorageKey}`, JSON.stringify(next));
      }
      return next;
    });
  };

  const activeColumns = columns.filter(
    (col) => visibleColumns[col.id] && !col.detailOnly,
  );
  const detailColumns = columns.filter((col) => !col.hideInDetail);
  const gridColumns = columns.filter((col) => visibleColumns[col.id]);
  const tableColSpan =
    activeColumns.length + (showRowDetails && effectiveViewMode === "table" ? 1 : 0);
  const exportRows = exportData ?? filteredData;

  const exportCSV = () => {
    if (exportRows.length === 0) return;
    const exportColumns = activeColumns.filter((col) => col.id !== "actions");
    const headers = exportColumns.map((c) => c.header).join(",");
    const rows = exportRows.map((item) => {
      return exportColumns
        .map((col) => `"${getColumnExportValue(col, item).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    if (exportRows.length === 0) return;
    const exportColumns = activeColumns.filter((col) => col.id !== "actions");
    const columnCount = exportColumns.length;
    const doc = createExportPdf(columnCount);
    const head = [exportColumns.map((c) => c.header)];
    const body = exportRows.map((item) =>
      exportColumns.map((col) => getColumnExportValue(col, item)),
    );

    runAutoTableExport(doc, {
      columnCount,
      head,
      body,
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });
    doc.save(`${filename}.pdf`);
  };

  if (isLoading) {
    return <PageTableSkeleton rows={loadingRows} columns={columns.length} showToolbar />;
  }

  if (error) {
    return <CmsErrorState message={errorMessage} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {searchKey ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              className="h-8 w-full bg-background pl-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {showViewToggle && !isMobile ? (
            <DataViewToggle value={viewMode} onChange={setViewMode} />
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Export As</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCSV} className="gap-2 cursor-pointer">
                <TableIcon className="h-3.5 w-3.5" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF} className="gap-2 cursor-pointer">
                <FileText className="h-3.5 w-3.5" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {effectiveViewMode === "table" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns
                  .filter((col) => !col.detailOnly && col.id !== "actions")
                  .map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col.id}
                      checked={visibleColumns[col.id]}
                      onCheckedChange={() => toggleColumn(col.id)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {col.header}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {effectiveViewMode === "grid" ? (
        displayData.length > 0 ? (
          <div className={gridClassName}>
            {displayData.map((item, index) => (
              <React.Fragment key={index}>
                {renderGridCard ? (
                  renderGridCard(item)
                ) : (
                  <DefaultGridCard
                    item={item}
                    columns={gridColumns}
                    onRowClick={onRowClick}
                    toneIndex={index}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-border/60 bg-card py-10 text-center text-xs text-muted-foreground">
            No results found.
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-md border border-border/60 bg-card">
          <Table>
            <TableHeader className="bg-muted/70 [&_tr]:border-border/60">
              <TableRow className="border-b hover:bg-muted/70">
                {showRowDetails && (
                  <TableHead className="h-8 w-8 bg-muted/70 px-1" aria-label="Expand row" />
                )}
                {activeColumns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={cn(
                      "h-8 bg-muted/70 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                      col.className,
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="bg-background">
              {displayData.length > 0 ? (
                displayData.map((item, rowIndex) => {
                  const isExpanded = expandedRow === rowIndex;
                  return (
                    <React.Fragment key={rowIndex}>
                      <TableRow
                        onClick={() => onRowClick?.(item)}
                        className={cn(
                          "border-b border-border/30 bg-background transition-colors last:border-0 hover:bg-muted/20",
                          isExpanded && "bg-muted/15",
                          onRowClick && "cursor-pointer",
                          getRowClassName?.(item),
                        )}
                      >
                        {showRowDetails && (
                          <TableCell className="w-8 px-1 py-1 align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground"
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? "Collapse details" : "Expand details"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRow(isExpanded ? null : rowIndex);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TableCell>
                        )}
                        {activeColumns.map((col) => (
                          <TableCell
                            key={col.id}
                            className={cn(
                              "px-2.5 py-1.5 align-middle text-xs text-foreground",
                              col.className,
                            )}
                          >
                            <div
                              className={cn(
                                "leading-snug",
                                col.id === "actions"
                                  ? "whitespace-nowrap"
                                  : "min-w-0 max-w-[360px] break-words",
                              )}
                            >
                              {col.cell
                                ? col.cell(item)
                                : col.accessorKey
                                  ? String(item[col.accessorKey] ?? "")
                                  : null}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                      {showRowDetails && isExpanded && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={tableColSpan} className="border-b p-0">
                            <TableDetailPanel item={item} columns={detailColumns} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={tableColSpan || 1}
                    className="h-16 text-center text-xs text-muted-foreground"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {resolvedPagination && (
        <DataPagination
          page={resolvedPagination.page}
          total={resolvedPagination.total}
          limit={resolvedPagination.limit}
          loadedRowCount={displayData.length}
          onPageChange={resolvedPagination.onPageChange}
          onLimitChange={resolvedPagination.onLimitChange}
          pageSizeOptions={resolvedPagination.pageSizeOptions}
          className="rounded-md border border-border/40"
        />
      )}
    </div>
  );
}
