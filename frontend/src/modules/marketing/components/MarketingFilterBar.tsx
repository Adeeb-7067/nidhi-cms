import { CmsFilterBar, type CmsSelectFilter } from "@/components/cms";

export function MarketingFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  dateRange,
  onDateRangeChange,
  client,
  onClientChange,
  clientList,
  onExport,
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  dateRange?: string;
  onDateRangeChange?: (v: string) => void;
  client?: string;
  onClientChange?: (v: string) => void;
  clientList?: { id: string; name: string }[];
  onExport?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const filters: CmsSelectFilter[] = [];
  if (onDateRangeChange !== undefined) {
    filters.push({
      key: "dateRange",
      value: dateRange,
      onChange: onDateRangeChange,
      placeholder: "Period",
      className: "sm:w-[140px]",
      options: [
        { value: "today", label: "Today" },
        { value: "week", label: "This week" },
        { value: "month", label: "This month" },
        { value: "quarter", label: "This quarter" },
      ],
    });
  }
  if (onClientChange !== undefined && clientList) {
    filters.push({
      key: "client",
      value: client,
      onChange: onClientChange,
      placeholder: "All clients",
      className: "sm:w-[180px]",
      allOption: { value: "all", label: "All clients" },
      options: clientList.map((c) => ({ value: c.id, label: c.name })),
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
