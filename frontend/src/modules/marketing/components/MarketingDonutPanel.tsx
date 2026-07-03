import { DashboardPipelineChart } from "@/components/dashboard/admin-dashboard-charts";
import { cn } from "@/lib/utils";

export type DonutSlice = { name: string; value: number; count?: number };

export function MarketingDonutPanel({
  title,
  data,
  className,
}: {
  title?: string;
  data: DonutSlice[];
  className?: string;
}) {
  const chartData = data.map((d) => ({ name: d.name, value: d.count ?? d.value }));

  return (
    <div className={cn("space-y-2", className)}>
      {title && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-0.5">
          {title}
        </p>
      )}
      <DashboardPipelineChart data={chartData} />
    </div>
  );
}
