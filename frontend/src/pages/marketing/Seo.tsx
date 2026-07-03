import { useMemo, useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, BookOpen, Gauge } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import {
  mockSeoKeywords,
  mockSeoAudits,
  mockCoreWebVitals,
  monthlyRankingTrend,
  mockBacklinksSummary,
} from "@/modules/marketing/mock-data";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingDualLineChart,
} from "@/modules/marketing/components";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-red-600" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function MarketingSeo() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockSeoKeywords.filter(
      (k) =>
        !q ||
        k.keyword.toLowerCase().includes(q) ||
        k.clientName.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="SEO panel"
        description="Keyword rankings, backlinks, audits, and Core Web Vitals"
        breadcrumbs={[{ label: "Marketing", href: "/marketing" }, { label: "SEO" }]}
      />

      <MarketingFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search keywords, clients…"
        onExport={() => toast.success("SEO report export started (demo)")}
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total backlinks</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{mockBacklinksSummary.total.toLocaleString("en-IN")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">New this month</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold text-emerald-600">+{mockBacklinksSummary.newThisMonth}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Lost</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold text-red-600">-{mockBacklinksSummary.lost}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Domain authority</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{mockBacklinksSummary.domainAuthority}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <ChartGridCell colSpan={8}>
          <ChartPanel title="Monthly ranking trend" description="Average rank and top-10 keywords" icon={BookOpen} accent="violet">
            <MarketingDualLineChart
              data={monthlyRankingTrend}
              line1Key="avgRank"
              line2Key="keywordsTop10"
              line1Label="Avg rank"
              line2Label="Keywords in top 10"
              line1Color="#8b5cf6"
              line2Color="#22c55e"
            />
          </ChartPanel>
        </ChartGridCell>
        <ChartGridCell colSpan={4}>
          <ChartPanel title="Core Web Vitals" description="Site performance metrics" icon={Gauge} accent="amber">
            <div className="space-y-2">
              {mockCoreWebVitals.map((v) => (
                <div key={v.metric} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span className="text-xs font-medium">{v.metric}</span>
                  <span className="text-xs">{v.value}</span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border",
                      v.status === "good" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
                      v.status === "needs_improvement" && "bg-amber-500/10 text-amber-700 border-amber-500/25",
                      v.status === "poor" && "bg-red-500/10 text-red-600 border-red-500/25",
                    )}
                  >
                    {v.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </ChartPanel>
        </ChartGridCell>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent audits</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs text-center">Score</TableHead>
                <TableHead className="text-xs text-center">Issues</TableHead>
                <TableHead className="text-xs">Last audit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSeoAudits.slice(0, 6).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{a.clientName}</TableCell>
                  <TableCell className="text-xs text-center font-medium">{a.score}/100</TableCell>
                  <TableCell className="text-xs text-center">{a.issues}</TableCell>
                  <TableCell className="text-xs">{new Date(a.lastAuditDate).toLocaleDateString("en-IN")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Keyword</TableHead>
              <TableHead className="text-xs">Client</TableHead>
              <TableHead className="text-xs text-center">Rank</TableHead>
              <TableHead className="text-xs text-center">Trend</TableHead>
              <TableHead className="text-xs text-right">Volume</TableHead>
              <TableHead className="text-xs">URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((k) => (
              <TableRow key={k.id}>
                <TableCell className="text-xs font-medium">{k.keyword}</TableCell>
                <TableCell className="text-xs">{k.clientName}</TableCell>
                <TableCell className="text-xs text-center font-semibold">#{k.currentRank}</TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex items-center gap-1">
                    <TrendIcon trend={k.trend} />
                    <span className="text-[10px] text-muted-foreground">
                      {k.previousRank !== k.currentRank ? `was #${k.previousRank}` : "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-right">{k.searchVolume.toLocaleString("en-IN")}</TableCell>
                <TableCell className="text-xs text-primary truncate max-w-[140px]">{k.url}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </PortalPageShell>
  );
}
