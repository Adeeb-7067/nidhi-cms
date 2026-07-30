import { CmsFilterBar, type CmsSelectFilter } from "@/components/cms";

function dateRangeOptions(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthLabel = now.toLocaleString("en-IN", { month: "short", year: "numeric" });
  const q = Math.floor(m / 3) + 1;
  const fyStart = m >= 3 ? y : y - 1;
  return [
    { value: "month", label: monthLabel },
    { value: "quarter", label: `Q${q} ${y}` },
    { value: "ytd", label: "Year to date" },
    { value: "fy", label: `FY ${fyStart}–${String(fyStart + 1).slice(2)}` },
  ];
}

/** Inclusive date window for dashboard / expense filters (local calendar). */
export function legalDateRangeBounds(range: string, now = new Date()): { start: Date; end: Date } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "month") {
    start.setDate(1);
    return { start, end };
  }
  if (range === "quarter" || range === "q2") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    start.setMonth(qStartMonth, 1);
    return { start, end };
  }
  if (range === "fy") {
    const y = now.getFullYear();
    const m = now.getMonth();
    if (m >= 3) start.setFullYear(y, 3, 1);
    else start.setFullYear(y - 1, 3, 1);
    return { start, end };
  }
  start.setMonth(0, 1);
  return { start, end };
}

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
      options: dateRangeOptions(),
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
