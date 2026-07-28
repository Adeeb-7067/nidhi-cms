import { CmsFilterBar, type CmsSelectFilter } from "@/components/cms";
import { PERIOD_FILTER_LABELS } from "../constants";
import type { PeriodFilter } from "../types";

export function CAFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  period,
  onPeriodChange,
  dateRange,
  onDateRangeChange,
  onExport,
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  period?: PeriodFilter;
  onPeriodChange?: (v: PeriodFilter) => void;
  dateRange?: string;
  onDateRangeChange?: (v: string) => void;
  onExport?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const filters: CmsSelectFilter[] = [];
  if (onPeriodChange) {
    filters.push({
      key: "period",
      value: period ?? "monthly",
      onChange: (v: string) => onPeriodChange(v as PeriodFilter),
      placeholder: "Period",
      className: "sm:w-[160px]",
      options: (Object.keys(PERIOD_FILTER_LABELS) as PeriodFilter[]).map((p) => ({
        value: p,
        label: PERIOD_FILTER_LABELS[p],
      })),
    });
  }
  if (onDateRangeChange) {
    filters.push({
      key: "dateRange",
      value: dateRange ?? "jun",
      onChange: onDateRangeChange,
      placeholder: "Date range",
      className: "sm:w-[220px]",
      options: [
        { value: "jun", label: "Jun 2026" },
        { value: "q1", label: "Q1 FY 2025–26" },
        { value: "fy", label: "FY 2025–26" },
        { value: "ytd", label: "Year to date" },
      ],
    });
  }

  return (
    <CmsFilterBar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      onExport={onExport}
      filters={filters.length ? filters : undefined}
      className={className}
    >
      {children}
    </CmsFilterBar>
  );
}
