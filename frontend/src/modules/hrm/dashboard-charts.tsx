import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HrmDashboardAnalytics } from "./types";
import { cn } from "@/lib/utils";

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  borderColor: "hsl(var(--border))",
  fontSize: "11px",
  borderRadius: "8px",
};

const HRM_CHART_HEIGHT = "h-[220px]";

export function HrmAttendanceTrendChart({
  data,
}: {
  data: HrmDashboardAnalytics["attendanceTrend"];
}) {
  if (!data.length) {
    return (
      <p className={cn(HRM_CHART_HEIGHT, "flex items-center justify-center text-xs text-muted-foreground")}>
        Attendance trend appears once daily records are materialized.
      </p>
    );
  }

  return (
    <div className={cn(HRM_CHART_HEIGHT, "w-full rounded-lg border border-border/40 bg-muted/15 p-1.5")}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="hrmPresentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="hrmAbsentGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value: number, name: string) => [
              value,
              name === "present" ? "Present" : "Absent",
            ]}
          />
          <Area
            type="monotone"
            dataKey="present"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#hrmPresentGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="absent"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#hrmAbsentGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HrmDepartmentBarChart({
  data,
}: {
  data: Array<{ name: string; count: number }>;
}) {
  if (!data.length) {
    return (
      <p className={cn(HRM_CHART_HEIGHT, "flex items-center justify-center text-xs text-muted-foreground")}>
        Assign departments to employees to see headcount breakdown.
      </p>
    );
  }

  const chartData = data.slice(0, 8).map((d) => ({ name: d.name, count: d.count }));

  return (
    <div className={cn(HRM_CHART_HEIGHT, "w-full rounded-lg border border-border/40 bg-muted/15 p-1.5")}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
