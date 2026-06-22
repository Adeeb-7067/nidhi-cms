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
      {onDateRangeChange && (
        <Select value={dateRange ?? "ytd"} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-full sm:w-[220px] h-9">
            <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Jun 2026</SelectItem>
            <SelectItem value="q2">Q2 2026</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
            <SelectItem value="fy">FY 2025–26</SelectItem>
          </SelectContent>
        </Select>
      )}
      {onCounselChange && counselList && (
        <Select value={counsel ?? "all"} onValueChange={onCounselChange}>
          <SelectTrigger className="w-full sm:w-[200px] h-9">
            <SelectValue placeholder="Counsel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All counsel</SelectItem>
            {counselList.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
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
