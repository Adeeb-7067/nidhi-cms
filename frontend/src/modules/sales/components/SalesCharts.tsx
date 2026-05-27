import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency } from "../constants";

export function SalesDualLineChart({
  data,
  line1Key,
  line2Key,
  line1Label,
  line2Label,
  line1Color = "#3b82f6",
  line2Color = "#22c55e",
  currency = false,
}: {
  data: Record<string, string | number>[];
  line1Key: string;
  line2Key: string;
  line1Label: string;
  line2Label: string;
  line1Color?: string;
  line2Color?: string;
  currency?: boolean;
}) {
  const fmt = (v: number) => (currency ? formatCompactCurrency(v) : v.toLocaleString());

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmt(Number(v))}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              fontSize: 11,
            }}
            formatter={(value: number, name: string) => [fmt(value), name]}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey={line1Key}
            name={line1Label}
            stroke={line1Color}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey={line2Key}
            name={line2Label}
            stroke={line2Color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SalesAreaTrendChart({
  data,
  dataKey = "count",
  stroke = "#3b82f6",
  gradientId = "salesTrend",
}: {
  data: { label: string; count: number }[];
  dataKey?: string;
  stroke?: string;
  gradientId?: string;
}) {
  const chartData = data.map((d) => ({ day: d.label, [dataKey]: d.count }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
