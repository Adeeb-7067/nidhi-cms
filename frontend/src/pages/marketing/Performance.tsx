import { Users } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { mockTeamPerformance } from "@/modules/marketing/mock-data";
import {
  MarketingPageHeader,
  MarketingFilterBar,
} from "@/modules/marketing/components";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MarketingPerformance() {
  const [dateRange, setDateRange] = useState("month");

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Team performance"
        description="Tasks completed, delivery time, client ratings, and productivity metrics"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Performance" }]}
      />

      <MarketingFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Performance report export started (demo)")}
      />

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Team member</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs text-right">Tasks done</TableHead>
              <TableHead className="text-xs text-right">Avg delivery</TableHead>
              <TableHead className="text-xs text-center">Client rating</TableHead>
              <TableHead className="text-xs">Productivity</TableHead>
              <TableHead className="text-xs text-right">Late %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTeamPerformance.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs font-medium">{m.name}</TableCell>
                <TableCell className="text-xs">{m.role}</TableCell>
                <TableCell className="text-xs text-right">{m.tasksCompleted}</TableCell>
                <TableCell className="text-xs text-right">{m.avgDeliveryDays} days</TableCell>
                <TableCell className="text-xs text-center">
                  <span className="inline-flex items-center gap-0.5">
                    <Users className="h-3 w-3 text-amber-500" />
                    {m.clientRating.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Progress value={m.productivityPct} className="h-1.5 flex-1" />
                    <span className="text-[10px] w-8">{m.productivityPct}%</span>
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "text-xs text-right font-medium",
                    m.lateDeliveryPct > 8 ? "text-red-600" : "text-muted-foreground",
                  )}
                >
                  {m.lateDeliveryPct}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalPageShell>
  );
}
