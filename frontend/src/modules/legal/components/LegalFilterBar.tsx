import { CmsFilterBar, type CmsSelectFilter } from "@/components/cms";

export function LegalFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  dateRange,
  onDateRangeChange,
  counsel,
  onCounselChange,
  counselList,
  onExport,
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  dateRange?: string;
  onDateRangeChange?: (v: string) => void;
  counsel?: string;
  onCounselChange?: (v: string) => void;
  counselList?: { id: number; name: string }[];
  onExport?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const filters: CmsSelectFilter[] = [];
  if (onDateRangeChange) {
    filters.push({
      key: "dateRange",
      value: dateRange ?? "ytd",
      onChange: onDateRangeChange,
      placeholder: "Date range",
      className: "sm:w-[220px]",
      options: [
        { value: "month", label: "Jun 2026" },
        { value: "q2", label: "Q2 2026" },
        { value: "ytd", label: "Year to date" },
        { value: "fy", label: "FY 2025–26" },
      ],
    });
  }
  if (onCounselChange && counselList) {
    filters.push({
      key: "counsel",
      value: counsel ?? "all",
      onChange: onCounselChange,
      placeholder: "Counsel",
      className: "sm:w-[200px]",
      allOption: { value: "all", label: "All counsel" },
      options: counselList.map((c) => ({ value: String(c.id), label: c.name })),
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
