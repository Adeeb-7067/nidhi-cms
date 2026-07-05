import { format } from "date-fns";
import { FileSpreadsheet, FileText } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockMarketingReports } from "@/modules/marketing/mock-data";
import { MarketingPageHeader } from "@/modules/marketing/components";
import { toast } from "sonner";

const periodLabels = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" } as const;

export default function MarketingReports() {
  const handleDownload = (title: string, format: "pdf" | "excel") => {
    toast.success(`${title} — ${format.toUpperCase()} download started (demo)`);
  };

  const grouped = {
    daily: mockMarketingReports.filter((r) => r.period === "daily"),
    weekly: mockMarketingReports.filter((r) => r.period === "weekly"),
    monthly: mockMarketingReports.filter((r) => r.period === "monthly"),
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Reports"
        description="Daily, weekly, and monthly marketing reports with PDF and Excel exports"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Reports" }]}
      />

      <div className="space-y-6">
        {(["daily", "weekly", "monthly"] as const).map((period) => (
          <div key={period} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {periodLabels[period]} reports
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grouped[period].map((report) => (
                <Card key={report.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm leading-snug">{report.title}</CardTitle>
                      <Badge variant="secondary" className="text-[9px] shrink-0">
                        {periodLabels[report.period]}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      {report.clientName ? `${report.clientName} · ` : ""}
                      Generated {format(new Date(report.generatedAt), "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 gap-1.5 text-xs"
                      onClick={() => handleDownload(report.title, "pdf")}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1 gap-1.5 text-xs"
                      onClick={() => handleDownload(report.title, "excel")}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Excel
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PortalPageShell>
  );
}
