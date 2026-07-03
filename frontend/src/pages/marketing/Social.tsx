import { Share2, TrendingUp, TrendingDown } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockSocialMetrics } from "@/modules/marketing/mock-data";
import { PLATFORM_LABELS } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  PlatformIconBadge,
} from "@/modules/marketing/components";
import { useState } from "react";
import { toast } from "sonner";

export default function MarketingSocial() {
  const [dateRange, setDateRange] = useState("month");

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Social analytics"
        description="Per-platform followers, reach, engagement, and top/bottom posts"
        breadcrumbs={[{ label: "Marketing", href: "/marketing" }, { label: "Social" }]}
      />

      <MarketingFilterBar
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExport={() => toast.success("Social report export started (demo)")}
      />

      <div className="grid gap-4">
        {mockSocialMetrics.map((m) => (
          <Card key={m.platform}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PlatformIconBadge platform={m.platform} />
                  {PLATFORM_LABELS[m.platform]}
                </CardTitle>
                <span className="text-xs text-muted-foreground">{m.engagementRate}% engagement rate</span>
              </div>
            </CardHeader>
            <CardContent>
              <PortalKpiGrid
                columns={3}
                count={3}
                items={[
                  { title: "Followers", value: m.followers.toLocaleString("en-IN"), icon: Share2, accent: "blue", delay: 0 },
                  { title: "Reach", value: m.reach.toLocaleString("en-IN"), icon: TrendingUp, accent: "green", delay: 1 },
                  { title: "Engagement", value: m.engagement.toLocaleString("en-IN"), icon: TrendingDown, accent: "violet", delay: 2 },
                ]}
              />
              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-lg border bg-emerald-500/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-medium">Best post</p>
                  <p className="text-xs mt-1">{m.bestPostTitle}</p>
                </div>
                <div className="rounded-lg border bg-red-500/5 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-red-600 font-medium">Needs improvement</p>
                  <p className="text-xs mt-1">{m.worstPostTitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PortalPageShell>
  );
}
