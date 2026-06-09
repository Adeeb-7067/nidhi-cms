import { motion } from "framer-motion";
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
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card/80 p-3 sm:flex-row sm:flex-wrap sm:items-center backdrop-blur-sm",
        className,
      )}
    >
      {onSearchChange !== undefined && (
        <motion.div className="relative flex-1 min-w-[200px]" initial={false}>
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            className="pl-9 h-9 bg-background"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </motion.div>
      )}
      {children}
      {onDateRangeChange && (
        <Select value={dateRange ?? "jun"} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-full sm:w-[220px] h-9">
            <Calendar className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jun">01 Jun – 30 Jun, 2026</SelectItem>
            <SelectItem value="may">01 May – 31 May, 2026</SelectItem>
            <SelectItem value="q1">Q1 FY 2026-27</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
      )}
      <motion.div className="flex gap-2 sm:ml-auto">
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
      </motion.div>
    </div>
  );
}
