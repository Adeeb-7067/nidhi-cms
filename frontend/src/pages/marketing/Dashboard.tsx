import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  CheckSquare,
  Clock,
  Megaphone,
  Calendar,
  Building2,
  TrendingUp,
  ArrowRight,
  Activity,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import {
  marketingDashboardKpis,
  tasksByStatus,
  tasksByCategory,
  monthlyEngagementTrend,
  mockMarketingActivity,
} from "@/modules/marketing/mock-data";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingDonutPanel,
  MarketingDualLineChart,
} from "@/modules/marketing/components";
import { toast } from "sonner";

export default function MarketingDashboard() {
  const [dateRange, setDateRange] = useState("month");
  const kpis = marketingDashboardKpis;

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Marketing Dashboard"
        description="Agency overview — tasks, approvals, campaigns, and team performance"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Dashboard" }]}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => toast.success("Marketing summary export started (demo)")}
          >
            Export summary
          </Button>
        }
      />

      <MarketingFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Export started (demo)")}
      />

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overview KPIs</p>
        <PortalKpiGrid
          columns={3}
          count={6}
          items={[
            { title: "Today's tasks", value: kpis.todaysTasks, hint: "Active & not started", icon: CheckSquare, accent: "blue", href: "/marketing/tasks", delay: 0 },
            { title: "Pending approvals", value: kpis.pendingApprovals, hint: "Awaiting review", icon: Clock, accent: "amber", href: "/marketing/approvals", delay: 1 },
            { title: "Ads running", value: kpis.adsRunning, hint: "Meta campaigns live", icon: Megaphone, accent: "green", href: "/marketing/meta-ads", delay: 2 },
            { title: "Posts scheduled", value: kpis.postsScheduled, hint: "Content calendar", icon: Calendar, accent: "blue", href: "/marketing/calendar", delay: 3 },
            { title: "Active clients", value: kpis.clientCount, hint: "Assigned accounts", icon: Building2, accent: "violet", href: "/marketing/clients", delay: 4 },
            { title: "Performance score", value: `${kpis.performanceScore}%`, hint: "Avg client score", icon: TrendingUp, accent: "green", href: "/marketing/performance", delay: 5 },
          ]}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <ChartGridCell colSpan={8}>
            <ChartPanel title="Engagement trend" description="Reach vs engagement" icon={TrendingUp} accent="blue">
              <MarketingDualLineChart
                data={monthlyEngagementTrend}
                line1Key="reach"
                line2Key="engagement"
                line1Label="Reach"
                line2Label="Engagement"
              />
            </ChartPanel>
          </ChartGridCell>
          <ChartGridCell colSpan={4}>
            <ChartPanel title="Tasks by status" description="Current workload" icon={CheckSquare} accent="violet">
              <MarketingDonutPanel data={tasksByStatus} />
            </ChartPanel>
          </ChartGridCell>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Breakdown & activity</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <ChartGridCell colSpan={4}>
            <ChartPanel title="Tasks by category" description="Work distribution" icon={BarChart3} accent="amber">
              <MarketingDonutPanel data={tasksByCategory} />
            </ChartPanel>
          </ChartGridCell>
          <ChartGridCell colSpan={8}>
            <ChartPanel title="Recent activity" description="Latest updates" icon={Activity} accent="emerald">
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {mockMarketingActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {a.actor} · {format(new Date(a.timestamp), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ChartPanel>
          </ChartGridCell>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
          <Link href="/marketing/tasks">
            View tasks <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
          <Link href="/marketing/reports">
            Reports <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </PortalPageShell>
  );
}
