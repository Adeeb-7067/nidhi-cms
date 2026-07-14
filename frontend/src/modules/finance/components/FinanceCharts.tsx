import {
  Area,
  AreaChart,
  Bar,
  BarChart,
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

export function FinanceDualLineChart({
  data,
  line1Key,
  line2Key,
  line1Label,
  line2Label,
  line1Color = "#22c55e",
  line2Color = "#ef4444",
  xKey = "month",
  currency = true,
  height = 220,
}: {
  data: Record<string, string | number>[];
  line1Key: string;
  line2Key: string;
  line1Label: string;
  line2Label: string;
  line1Color?: string;
  line2Color?: string;
  xKey?: string;
  currency?: boolean;
  height?: number;
}) {
  const fmt = (v: number) => (currency ? formatCompactCurrency(v) : v.toLocaleString());

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey={xKey}
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
          <Line type="monotone" dataKey={line1Key} name={line1Label} stroke={line1Color} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey={line2Key} name={line2Label} stroke={line2Color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FinanceBarChart({
  data,
  dataKey,
  nameKey = "name",
  color = "#3b82f6",
  currency = true,
  height = 220,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  nameKey?: string;
  color?: string;
  currency?: boolean;
  height?: number;
}) {
  const fmt = (v: number) => (currency ? formatCompactCurrency(v) : v.toLocaleString());

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
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
            formatter={(value: number) => [fmt(value), "Amount"]}
          />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FinanceAreaTrendChart({
  data,
  dataKey,
  xKey = "month",
  stroke = "#3b82f6",
  gradientId = "financeTrend",
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  xKey?: string;
  stroke?: string;
  gradientId?: string;
}) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v) => formatCompactCurrency(Number(v))}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--border))",
              fontSize: 11,
            }}
            formatter={(value: number) => [formatCompactCurrency(value), ""]}
          />
          <Area type="monotone" dataKey={dataKey} stroke={stroke} strokeWidth={2} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
