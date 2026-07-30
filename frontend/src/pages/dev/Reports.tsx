import React, { useState, useMemo, useEffect } from "react";
import {
  useListReports,
  useGenerateReport,
  useListProjects,
  downloadReport,
  type ReportInputType,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DAILY_LOG_VIRTUAL_PROJECTS,
  isVirtualDailyLogProjectId,
} from "@/lib/daily-log-project-options";
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { useClientPagination } from "@/lib/table-pagination";
import { PageTableSkeleton } from "@/components/loading";
import { FileText, Download, Loader2, Plus, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  DevPageShell,
  DevPageHero,
  DevKpiGrid,
  DevEmptyState,
  devActionButtonClass,
} from "@/components/dev/dev-page-kit";
import { CmsRowActions } from "@/components/cms";
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
  const { pagination: clientPagination } = useClientPagination(reportsData ?? []);
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

  const logReportTypes: ReportInputType[] = [
    "developer_monthly",
    "project_progress",
    "raw_log_export",
  ];
  const showVirtualProjectOptions = logReportTypes.includes(reportType);

  useEffect(() => {
    if (showVirtualProjectOptions || !projectId) return;
    const selectedId = Number.parseInt(projectId, 10);
    if (Number.isFinite(selectedId) && isVirtualDailyLogProjectId(selectedId)) {
      setProjectId("");
    }
  }, [showVirtualProjectOptions, projectId]);

  const handleGenerate = () => {
    if (!projectId) {
      toast.error(showVirtualProjectOptions ? "Please select a project or activity" : "Please select a project");
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
          <CmsRowActions
            label="Report actions"
            items={[
              {
                label: downloadingId === report.id ? "Downloading…" : "Download",
                icon: downloadingId === report.id ? Loader2 : Download,
                onSelect: () => void handleDownload(report.id),
                disabled: downloadingId === report.id,
              },
            ]}
          />
        ) : report.status === "generating" || report.status === "queued" ? (
          <CmsRowActions
            label="Report actions"
            items={[
              {
                label: "Processing",
                icon: Loader2,
                disabled: true,
              },
            ]}
          />
        ) : report.status === "failed" ? (
          <CmsRowActions
            label="Report actions"
            items={[
              {
                label: "Generation failed",
                icon: AlertCircle,
                disabled: true,
                variant: "destructive",
              },
            ]}
          />
        ) : null,
    },
  ];

  return (
    <DevPageShell>
      <DevPageHero
        title="Reports"
        subtitle="Generate project and time reports"
        actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className={devActionButtonClass()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
              <DialogDescription>Create a new report for a specific project and period.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="project">
                  {showVirtualProjectOptions ? "Project / activity" : "Project"}
                </Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="project">
                    <SelectValue
                      placeholder={
                        showVirtualProjectOptions
                          ? "Select project or activity"
                          : "Select a project"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {showVirtualProjectOptions ? (
                      <SelectGroup>
                        <SelectLabel>General</SelectLabel>
                        {DAILY_LOG_VIRTUAL_PROJECTS.map((option) => (
                          <SelectItem key={option.id} value={String(option.id)}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
                    {(projectsData?.projects?.length ?? 0) > 0 ? (
                      <SelectGroup>
                        {showVirtualProjectOptions ? (
                          <SelectLabel>Projects</SelectLabel>
                        ) : null}
                        {projectsData!.projects.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : null}
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
        }
      />

      <DevKpiGrid
        loading={reportsLoading && !reportsData}
        items={[
          { title: "Total reports", value: reportStats.total, hint: "Generated files", icon: FileText, accent: "violet" },
          { title: "Ready", value: reportStats.ready, hint: "Available to download", icon: CheckCircle2, accent: "green" },
          { title: "In progress", value: reportStats.generating, hint: "Queued or generating", icon: Clock, accent: "blue" },
          { title: "Failed", value: reportStats.failed, hint: "Needs retry", icon: AlertCircle, accent: "red", alert: reportStats.failed > 0 },
        ]}
      />

      {reportsLoading ? (
        <PageTableSkeleton rows={6} columns={5} showToolbar />
      ) : !reportsData?.length ? (
        <DevEmptyState
          icon={FileText}
          title="No reports generated yet"
          description="Use Generate Report to create a timesheet, project summary, or bug export."
        />
      ) : (
        <AdvancedTable
          data={reportsData}
          columns={columns}
          filename="ReportsExport"
          viewStorageKey="dev-reports"
          showViewToggle
          clientPagination={clientPagination}
        />
      )}
    </DevPageShell>
  );
}
