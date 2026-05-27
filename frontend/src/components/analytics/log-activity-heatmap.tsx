import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export function buildHeatmapGrid(
  heatmapData: { date: string; count: number }[],
  year: number,
  month: number,
) {
  const countByDate = new Map(heatmapData.map((p) => [p.date.slice(0, 10), p.count]));
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: { date: string; day: number; count: number }[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date: iso, day, count: countByDate.get(iso) ?? 0 });
  }
  const max = Math.max(1, ...cells.map((c) => c.count));
  return { cells, max };
}

export function LogActivityHeatmap({
  heatmapData,
  month,
  year,
  compact = false,
}: {
  heatmapData: { date: string; count: number }[];
  month: number;
  year: number;
  compact?: boolean;
}) {
  const { cells, max } = useMemo(
    () => buildHeatmapGrid(heatmapData, year, month),
    [heatmapData, month, year],
  );
  const totalEntries = heatmapData.reduce((s, p) => s + p.count, 0);

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{totalEntries} log entries in period</span>
        <div className="flex items-center gap-2">
          <span>Less</span>
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <span
                key={t}
                className={cn(
                  "rounded-sm border border-border/50",
                  compact ? "h-2.5 w-2.5" : "h-3 w-3",
                )}
                style={{
                  backgroundColor:
                    t === 0
                      ? "hsl(var(--muted))"
                      : `color-mix(in srgb, hsl(var(--primary)) ${20 + t * 70}%, transparent)`,
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
      <div className={cn("grid grid-cols-7", compact ? "gap-1" : "gap-1.5")}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={`${d}-${i}`}
            className="text-center text-[9px] font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: (new Date(year, month - 1, 1).getDay() + 6) % 7 }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {cells.map((cell) => {
          const intensity = cell.count / max;
          return (
            <div
              key={cell.date}
              title={`${cell.date}: ${cell.count} log(s)`}
              className={cn(
                "aspect-square rounded-md border flex flex-col items-center justify-center tabular-nums transition-colors",
                compact ? "text-[8px]" : "text-[9px]",
                cell.count === 0
                  ? "border-border/40 bg-muted/30 text-muted-foreground"
                  : "border-primary/20 text-foreground",
              )}
              style={
                cell.count > 0
                  ? {
                      backgroundColor: `color-mix(in srgb, hsl(var(--primary)) ${12 + intensity * 55}%, transparent)`,
                    }
                  : undefined
              }
            >
              <span className="font-medium">{cell.day}</span>
              {cell.count > 0 && (
                <span className="text-[8px] text-muted-foreground">{cell.count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
