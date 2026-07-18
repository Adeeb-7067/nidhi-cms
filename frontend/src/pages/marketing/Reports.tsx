import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FileSpreadsheet, FileText, Loader2, Pencil, Trash2, Plus, CalendarDays, CalendarRange, CalendarClock } from "lucide-react";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMarketingReports,
  useCreateMarketingReport,
  useUpdateMarketingReport,
  useDeleteMarketingReport,
} from "@/api/marketing";
import {
  MarketingPageHeader,
  MarketingEmptyState,
  MarketingConfirmDialog,
  DigitalProjectSelect,
} from "@/modules/marketing/components";
import { useAccountProjectFilter } from "@/modules/marketing/account-query";
import { MarketingListPageSkeleton } from "@/components/loading";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";
import { usePermissions } from "@/modules/permissions/usePermission";

const periodLabels = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" } as const;
type ReportPeriod = keyof typeof periodLabels;

type ReportRow = {
  id: string;
  title: string;
  period: ReportPeriod;
  generatedAt: string;
  clientName?: string;
  accountId?: number | null;
};

const emptyForm = {
  accountId: "",
  title: "",
  period: "weekly" as ReportPeriod,
};

export default function MarketingReports() {
  const { can } = usePermissions();
  const canCreate = can("marketing_reports", "create");
  const canEdit = can("marketing_reports", "edit");
  const canDelete = can("marketing_reports", "delete");
  const showActions = canEdit || canDelete;

  const [projectFilter, setProjectFilter] = useAccountProjectFilter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReportRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const accountFilterId = projectFilter ? Number(projectFilter) : undefined;
  const { data, isLoading, isError } = useMarketingReports(
    accountFilterId ? { accountId: accountFilterId } : undefined,
  );
  const createReport = useCreateMarketingReport();
  const updateReport = useUpdateMarketingReport();
  const deleteReport = useDeleteMarketingReport();
  const reports = data?.reports ?? [];
  const saving = createReport.isPending || updateReport.isPending;

  const kpis = useMemo(
    () => ({
      total: reports.length,
      daily: reports.filter((r) => r.period === "daily").length,
      weekly: reports.filter((r) => r.period === "weekly").length,
      monthly: reports.filter((r) => r.period === "monthly").length,
    }),
    [reports],
  );

  const handleDownload = () => {
    toast.info("PDF/Excel export coming soon");
  };

  const grouped = {
    daily: reports.filter((r) => r.period === "daily"),
    weekly: reports.filter((r) => r.period === "weekly"),
    monthly: reports.filter((r) => r.period === "monthly"),
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, accountId: projectFilter || "" });
    setDialogOpen(true);
  };

  const openEdit = (report: ReportRow) => {
    if (report.accountId == null) {
      toast.error("This report is not linked to a digital project. Recreate it under a project.");
      return;
    }
    setEditing(report);
    setForm({
      accountId: String(report.accountId),
      title: report.title,
      period: report.period,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      if (editing) {
        if (editing.accountId == null) {
          toast.error("This report is not linked to a digital project");
          return;
        }
        await updateReport.mutateAsync({
          id: editing.id,
          accountId: editing.accountId,
          data: { title: form.title.trim(), period: form.period },
        });
        toast.success("Report updated");
      } else {
        if (!form.accountId) {
          toast.error("Digital project is required");
          return;
        }
        await createReport.mutateAsync({
          title: form.title.trim(),
          period: form.period,
          accountId: Number(form.accountId),
        });
        toast.success("Report created");
      }
      setDialogOpen(false);
    } catch (err) {
      toastApiError(err, editing ? "Failed to update report" : "Failed to create report");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.accountId == null) {
      toast.error("This report is not linked to a digital project");
      return;
    }
    try {
      await deleteReport.mutateAsync({
        id: deleteTarget.id,
        accountId: deleteTarget.accountId,
      });
      toast.success("Report deleted");
      setDeleteTarget(null);
    } catch (err) {
      toastApiError(err, "Failed to delete report");
    }
  };

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Reports"
        description="Daily, weekly, and monthly marketing reports"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Reports" }]}
        actions={
          <>
            <DigitalProjectSelect
              allowAll
              value={projectFilter}
              onValueChange={setProjectFilter}
              className="h-8 w-[220px] text-xs"
            />
            {canCreate && (
              <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5" />
                New report
              </Button>
            )}
          </>
        }
      />

      <PortalKpiGrid
        loading={isLoading}
        columns={4}
        count={4}
        items={[
          { title: "Total reports", value: kpis.total, icon: FileText, accent: "blue", delay: 0 },
          { title: "Daily", value: kpis.daily, icon: CalendarDays, accent: "amber", delay: 1 },
          { title: "Weekly", value: kpis.weekly, icon: CalendarRange, accent: "violet", delay: 2 },
          { title: "Monthly", value: kpis.monthly, icon: CalendarClock, accent: "green", delay: 3 },
        ]}
      />

      {isLoading ? (
        <MarketingListPageSkeleton kpiCount={4} showTabs={false} />
      ) : isError ? (
        <MarketingEmptyState icon={FileText} title="Could not load reports" description="Check your connection and try again." />
      ) : reports.length === 0 ? (
        <MarketingEmptyState
          icon={FileText}
          title="No reports yet"
          description="Generated reports will appear here."
          actionLabel={canCreate ? "New report" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      ) : (
        <div className="space-y-6">
          {(["daily", "weekly", "monthly"] as const).map((period) =>
            grouped[period].length === 0 ? null : (
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
                      <CardContent className="space-y-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 flex-1 gap-1.5 text-xs"
                            onClick={handleDownload}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 flex-1 gap-1.5 text-xs"
                            onClick={handleDownload}
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Excel
                          </Button>
                        </div>
                        {showActions && (
                          <div className="flex gap-2">
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 flex-1 gap-1.5 text-xs"
                                onClick={() => openEdit(report)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 flex-1 gap-1.5 text-xs text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(report)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit report" : "New report"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs">Digital project</Label>
                <DigitalProjectSelect
                  value={form.accountId}
                  onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
                  className="h-8 w-full text-xs"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Period</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm((f) => ({ ...f, period: v as ReportPeriod }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(periodLabels).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MarketingConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete report?"
        description={deleteTarget ? `"${deleteTarget.title}" will be removed.` : undefined}
        loading={deleteReport.isPending}
        onConfirm={() => void handleDelete()}
      />
    </PortalPageShell>
  );
}
