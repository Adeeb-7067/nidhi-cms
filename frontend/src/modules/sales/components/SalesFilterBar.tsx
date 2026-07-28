import { CmsFilterBar, type CmsSelectFilter } from "@/components/cms";

export function SalesFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  dateRange,
  onDateRangeChange,
  executive,
  onExecutiveChange,
  executives,
  onExport,
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  dateRange?: string;
  onDateRangeChange?: (v: string) => void;
  executive?: string;
  onExecutiveChange?: (v: string) => void;
  executives?: { id: number; name: string }[];
  onExport?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const filters: CmsSelectFilter[] = [];
  if (onDateRangeChange) {
    filters.push({
      key: "dateRange",
      value: dateRange ?? "may",
      onChange: onDateRangeChange,
      placeholder: "Date range",
      className: "sm:w-[220px]",
      options: [
        { value: "may", label: "01 May – 31 May, 2026" },
        { value: "apr", label: "01 Apr – 30 Apr, 2026" },
        { value: "q1", label: "Q1 2026" },
        { value: "ytd", label: "Year to date" },
      ],
    });
  }
  if (onExecutiveChange && executives) {
    filters.push({
      key: "executive",
      value: executive ?? "all",
      onChange: onExecutiveChange,
      placeholder: "Executive",
      className: "sm:w-[180px]",
      allOption: { value: "all", label: "All executives" },
      options: executives.map((e) => ({ value: String(e.id), label: e.name })),
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
