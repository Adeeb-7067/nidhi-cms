import { CmsFilterBar } from "@/components/cms";

export function FinanceFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  dateRange,
  onDateRangeChange,
  onExport,
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  dateRange?: string;
  onDateRangeChange?: (v: string) => void;
  onExport?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <CmsFilterBar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      onExport={onExport}
      className={className}
      filters={
        onDateRangeChange
          ? [
              {
                key: "dateRange",
                value: dateRange ?? "current",
                onChange: onDateRangeChange,
                placeholder: "Date range",
                className: "sm:w-[220px]",
                options: [
                  { value: "current", label: "Current month" },
                  { value: "previous", label: "Previous month" },
                ],
              },
            ]
          : undefined
      }
    >
      {children}
    </CmsFilterBar>
  );
}
