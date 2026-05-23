import React, { useState, useMemo, useEffect } from "react";
import {
  useListReports,
  useGenerateReport,
  useListProjects,
  downloadReport,
  type ReportInputType,
} from "@/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, Loader2, Plus, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { StatCard, PageKpiRow, PageKpiSkeleton } from "@/components/dashboard/dashboard-kit";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { apiUrl } from "@/lib/api-base";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const REPORT_TYPE_OPTIONS: { value: ReportInputType; label: string }[] = [
  { value: "developer_monthly", label: "Timesheet (monthly logs)" },
  { value: "project_progress", label: "Project summary" },
  { value: "bug_report", label: "Bug report" },
  { value: "raw_log_export", label: "Raw log export (Excel)" },
];

const REPORT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export default function DevReports() {
  const { data: reportsData, isLoading: reportsLoading, refetch } = useListReports();
  const { data: projectsData } = useListProjects({ limit: 100 });
  const generateMutation = useGenerateReport();
  const [open, setOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const [projectId, setProjectId] = useState<string>("");
  const [reportType, setReportType] = useState<ReportInputType>("developer_monthly");
  const [month, setMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());

  const hasInProgress = useMemo(
    () =>
      (reportsData ?? []).some(
        (r) => r.status === "queued" || r.status === "generating",
      ),
    [reportsData],
  );

  useEffect(() => {
    if (!hasInProgress) return;
    const timer = setInterval(() => void refetch(), 3000);
    return () => clearInterval(timer);
  }, [hasInProgress, refetch]);

  const reportStats = useMemo(() => {
    const reports = reportsData ?? [];
    return {
      total: reports.length,
      ready: reports.filter((r) => r.status === "ready").length,
      generating: reports.filter(
        (r) => r.status === "generating" || r.status === "queued",
      ).length,
      failed: reports.filter((r) => r.status === "failed").length,
    };
  }, [reportsData]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const handleGenerate = () => {
    if (!projectId) {
      toast.error("Please select a project");
      return;
    }

    generateMutation.mutate(
      {
        data: {
          projectId: Number(projectId),
          type: reportType,
          month: Number(month),
          year: Number(year),
        },
      },
      {
        onSuccess: () => {
          toast.success("Report generation started");
          setOpen(false);
          void refetch();
        },
        onError: (err) => {
          toastApiError(err, "Failed to generate report");
        },
      },
    );
  };

  const handleDownload = async (reportId: number) => {
    setDownloadingId(reportId);
    try {
      const { url } = await downloadReport(reportId);
      const href = url.startsWith("http") ? url : apiUrl(url);
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (err) {
      toastApiError(err, "Failed to download report");
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "generating":
      case "queued":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  type ReportRow = NonNullable<typeof reportsData>[number];

  const columns: Column<ReportRow>[] = [
    {
      id: "name",
      header: "Report Name",
      cell: (report) => (
        <span className="font-medium flex items-center text-xs">
          <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
          {REPORT_TYPE_LABELS[report.type] ?? report.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: (report) => (
        <span className="capitalize text-muted-foreground text-xs">
          {report.type.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      id: "period",
      header: "Period",
      cell: (report) => (
        <span className="text-muted-foreground text-xs">
          {report.month && report.year ? `${report.month}/${report.year}` : "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (report) => (
        <Badge variant="outline" className={cn("text-[10px]", getStatusColor(report.status))}>
          {report.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      id: "generated",
      header: "Generated At",
      cell: (report) => (
        <span className="text-muted-foreground text-xs">
          {new Date(report.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: "projectId",
      header: "Project ID",
      detailOnly: true,
      detailCell: (report) => (report.projectId != null ? String(report.projectId) : "—"),
    },
    {
      id: "completedAt",
      header: "Completed",
      detailOnly: true,
      detailCell: (report) =>
        report.completedAt ? new Date(report.completedAt).toLocaleString() : "—",
    },
    {
      id: "requestedBy",
      header: "Requested by (user ID)",
      detailOnly: true,
      detailCell: (report) => String(report.requestedBy),
    },
    {
      id: "actions",
      header: "Action",
      hideInDetail: true,
      cell: (report) =>
        report.status === "ready" && report.fileUrl ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            disabled={downloadingId === report.id}
            onClick={() => void handleDownload(report.id)}
          >
            {downloadingId === report.id ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-2" />
            )}
            Download
          </Button>
        ) : report.status === "generating" || report.status === "queued" ? (
          <Button size="sm" variant="ghost" className="h-8 text-xs" disabled>
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Processing
          </Button>
        ) : report.status === "failed" ? (
          <span className="text-[10px] text-red-500">Generation failed</span>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generate project and time reports</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" /> Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
              <DialogDescription>Create a new report for a specific project and period.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsData?.projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Report Type</Label>
                <Select
                  value={reportType}
                  onValueChange={(v) => setReportType(v as ReportInputType)}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="month">Month</Label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger id="month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="year">Year</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger id="year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={generateMutation.isPending} onClick={handleGenerate}>
                {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {reportsLoading ? (
        <PageKpiSkeleton />
      ) : (
        <PageKpiRow>
          <StatCard
            title="Total reports"
            value={reportStats.total}
            hint="Generated files"
            icon={FileText}
            accent="violet"
            delay={0}
          />
          <StatCard
            title="Ready"
            value={reportStats.ready}
            hint="Available to download"
            icon={CheckCircle2}
            accent="green"
            delay={1}
          />
          <StatCard
            title="In progress"
            value={reportStats.generating}
            hint="Queued or generating"
            icon={Clock}
            accent="blue"
            delay={2}
          />
          <StatCard
            title="Failed"
            value={reportStats.failed}
            hint="Needs retry"
            icon={AlertCircle}
            accent="red"
            alert={reportStats.failed > 0}
            delay={3}
          />
        </PageKpiRow>
      )}

      <Card className="bg-card">
        <CardContent className="p-4">
          {reportsLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !reportsData?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              No reports generated yet.
            </div>
          ) : (
            <AdvancedTable
              data={reportsData}
              columns={columns}
              filename="ReportsExport"
              viewStorageKey="dev-reports"
              showViewToggle
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
