import { Search, Calendar, Download, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type CmsFilterOption = { value: string; label: string };

export type CmsSelectFilter = {
  key: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: CmsFilterOption[];
  placeholder?: string;
  icon?: LucideIcon;
  /** Tailwind width classes, e.g. "w-full sm:w-[220px]" */
  className?: string;
  allOption?: { value: string; label: string };
};

/** Shared search + select + export toolbar for CMS list pages. */
export function CmsFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  onExport,
  onAdvancedFilters,
  children,
  className,
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  filters?: CmsSelectFilter[];
  onExport?: () => void;
  /** Only renders the Filters button when provided. */
  onAdvancedFilters?: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/80 p-3 sm:flex-row sm:flex-wrap sm:items-center backdrop-blur-sm",
        className,
      )}
    >
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9 h-9 bg-background"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}
      {filters?.map((filter) => {
        const Icon = filter.icon ?? Calendar;
        return (
          <Select
            key={filter.key}
            value={filter.value}
            onValueChange={filter.onChange}
          >
            <SelectTrigger className={cn("h-9 w-full sm:w-[180px] bg-background", filter.className)}>
              <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder={filter.placeholder ?? "Filter"} />
            </SelectTrigger>
            <SelectContent>
              {filter.allOption && (
                <SelectItem value={filter.allOption.value}>{filter.allOption.label}</SelectItem>
              )}
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}
      {children}
      {(onAdvancedFilters || onExport) && (
        <div className="flex gap-2 sm:ml-auto">
          {onAdvancedFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={onAdvancedFilters}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </Button>
          )}
          {onExport && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={onExport}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
