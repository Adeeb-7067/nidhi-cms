import { Search, Calendar, Download } from "lucide-react";
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
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}
      {onDateRangeChange !== undefined && (
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="h-9 w-[140px] bg-background">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="quarter">This quarter</SelectItem>
          </SelectContent>
        </Select>
      )}
      {onClientChange !== undefined && clientList && (
        <Select value={client} onValueChange={onClientChange}>
          <SelectTrigger className="h-9 w-[180px] bg-background">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clientList.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {children}
      {onExport && (
        <Button size="sm" variant="outline" className="h-9 gap-1.5 ml-auto" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      )}
    </div>
  );
}
