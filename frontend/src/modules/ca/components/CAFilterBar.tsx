import { Search, SlidersHorizontal, Calendar, Download } from "lucide-react";
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
      {children}
      {onPeriodChange && (
        <Select value={period ?? "monthly"} onValueChange={(v) => onPeriodChange(v as PeriodFilter)}>
          <SelectTrigger className="w-full sm:w-[160px] h-9">
            <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_FILTER_LABELS) as PeriodFilter[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PERIOD_FILTER_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onDateRangeChange && (
        <Select value={dateRange ?? "jun"} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-full sm:w-[220px] h-9">
            <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jun">Jun 2026</SelectItem>
            <SelectItem value="q1">Q1 FY 2025–26</SelectItem>
            <SelectItem value="fy">FY 2025–26</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-2 sm:ml-auto">
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </Button>
        {onExport && (
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
}
