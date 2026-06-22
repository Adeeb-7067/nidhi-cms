import { ShieldCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { ChartPanel } from "@/components/dashboard/admin-dashboard-charts";
import { complianceScoreBreakdown, complianceScoreHistory } from "@/modules/ca/mock-data";
import { formatPercent } from "@/modules/ca/constants";
import { CAPageHeader, CAScoreWidget } from "@/modules/ca/components";

export default function ComplianceScore() {
  const scores = complianceScoreBreakdown;

  return (
    <PortalPageShell>
      <CAPageHeader
        title="CEO compliance score"
        description="GST, tax, ROC, and audit readiness — overall compliance percentage"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Compliance score" }]}
      />
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Overall compliance score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold tabular-nums text-primary">{formatPercent(scores.overall)}</p>
          <Progress value={scores.overall} className="h-3 mt-3" />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CAScoreWidget label="GST compliance" score={scores.gst} />
        <CAScoreWidget label="Tax compliance" score={scores.tax} />
        <CAScoreWidget label="ROC compliance" score={scores.roc} />
        <CAScoreWidget label="Audit readiness" score={scores.audit} />
      </div>
      <ChartPanel title="Score trend" description="Last 6 months" icon={ShieldCheck} accent="blue">
        <div className="grid grid-cols-6 gap-2 pt-2">
          {complianceScoreHistory.map((h) => (
            <div key={h.month} className="text-center">
              <div className="mx-auto w-full max-w-[48px] h-24 bg-muted/30 rounded flex flex-col justify-end overflow-hidden">
                <div className="bg-primary/70 rounded-t" style={{ height: `${h.score}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{h.month}</p>
              <p className="text-xs font-semibold tabular-nums">{h.score}%</p>
            </div>
          ))}
        </div>
      </ChartPanel>
    </PortalPageShell>
  );
}
