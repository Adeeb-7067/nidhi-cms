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
        "p-0 overflow-hidden border shadow-sm transition-all duration-200",
        tone,
        onRowClick && "cursor-pointer hover:shadow-md hover:border-primary/35 hover:-translate-y-0.5",
      )}
      onClick={() => onRowClick?.(item)}
    >
      {primary && (
        <div className="mb-0 min-w-0 px-4 pt-4 pb-3 bg-white/50 dark:bg-black/15 border-b border-border/40">
          {primary.cell
            ? primary.cell(item)
            : primary.accessorKey
              ? String(item[primary.accessorKey] ?? "")
              : null}
        </div>
      )}
      {bodyCols.length > 0 && (
        <dl className="space-y-2 px-4 py-3">
          {bodyCols.map((col) => (
            <div key={col.id} className="flex justify-between gap-3 text-xs">
              <dt className="text-muted-foreground shrink-0">{col.header}</dt>
              <dd className="text-right font-medium min-w-0 text-foreground text-sm leading-relaxed">
                {getColumnDetailContent(col, item)}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {actionsCol?.cell && (
        <div
          className="px-4 py-3 border-t border-border/40 bg-white/40 dark:bg-black/10 flex justify-end"
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
  onRowClick,
  viewStorageKey,
  defaultViewMode = "table",
  showViewToggle = true,
  renderGridCard,
  gridClassName = "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4",
  showRowDetails = true,
  getRowClassName,
  pagination,
  clientPagination,
}: AdvancedTableProps<T>) {
  const [viewMode, setViewMode] = useDataViewMode(viewStorageKey, defaultViewMode);
  const isMobile = useMobileViewport();
  const effectiveViewMode: DataViewMode = isMobile ? "grid" : viewMode;
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    columns.reduce((acc, col) => ({ ...acc, [col.id]: true }), {}),
  );

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
    setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeColumns = columns.filter(
    (col) => visibleColumns[col.id] && !col.detailOnly,
  );
  const detailColumns = columns.filter((col) => !col.hideInDetail);
  const gridColumns = columns.filter((col) => visibleColumns[col.id]);
  const tableColSpan =
    activeColumns.length + (showRowDetails && effectiveViewMode === "table" ? 1 : 0);

  const exportCSV = () => {
    if (filteredData.length === 0) return;
    const exportColumns = activeColumns.filter((col) => col.id !== "actions");
    const headers = exportColumns.map((c) => c.header).join(",");
    const rows = filteredData.map((item) => {
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
    if (filteredData.length === 0) return;
    const exportColumns = activeColumns.filter((col) => col.id !== "actions");
    const columnCount = exportColumns.length;
    const doc = createExportPdf(columnCount);
    const head = [exportColumns.map((c) => c.header)];
    const body = filteredData.map((item) =>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {searchKey ? (
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-foreground/60" strokeWidth={2} />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              className="pl-8 w-full bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
          {showViewToggle && !isMobile ? (
            <DataViewToggle value={viewMode} onChange={setViewMode} />
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1 text-foreground">
                <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Export As</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportCSV} className="gap-2 cursor-pointer">
                <TableIcon className="h-4 w-4 text-foreground" strokeWidth={2} /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-foreground" strokeWidth={2} /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {effectiveViewMode === "table" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1 text-foreground">
                  <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns
                  .filter((col) => !col.detailOnly)
                  .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={visibleColumns[col.id]}
                    onCheckedChange={() => toggleColumn(col.id)}
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
          <div className="rounded-md border bg-card py-16 text-center text-sm text-muted-foreground">
            No results found.
          </div>
        )
      ) : (
        <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                {showRowDetails && (
                  <TableHead className="w-10 py-3" aria-label="Expand row" />
                )}
                {activeColumns.map((col) => (
                  <TableHead
                    key={col.id}
                    className={cn("font-semibold text-foreground py-3", col.className)}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.length > 0 ? (
                displayData.map((item, rowIndex) => {
                  const isExpanded = expandedRow === rowIndex;
                  return (
                    <React.Fragment key={rowIndex}>
                      <TableRow
                        onClick={() => onRowClick?.(item)}
                        className={cn(
                          isExpanded && "bg-muted/30",
                          onRowClick ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/30",
                          getRowClassName?.(item),
                        )}
                      >
                        {showRowDetails && (
                          <TableCell className="py-2 w-10 align-top">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 text-foreground"
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? "Collapse details" : "Expand details"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedRow(isExpanded ? null : rowIndex);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" strokeWidth={2} />
                              ) : (
                                <ChevronRight className="h-4 w-4" strokeWidth={2} />
                              )}
                            </Button>
                          </TableCell>
                        )}
                        {activeColumns.map((col) => (
                          <TableCell
                            key={col.id}
                            className={cn("py-3 align-top", col.className)}
                          >
                            <div className="whitespace-normal break-words text-sm leading-snug min-w-[80px] max-w-[420px]">
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
                          <TableCell colSpan={tableColSpan} className="p-0 border-b">
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
                    className="h-24 text-center text-muted-foreground"
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
          className="-mx-0 mt-0 rounded-b-lg"
        />
      )}
    </div>
  );
}
