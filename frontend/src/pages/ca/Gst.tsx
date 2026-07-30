import { useMemo } from "react";
import { format } from "date-fns";
import { Receipt, AlertCircle, ExternalLink, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsConfirmDialog, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { useTaxSummary } from "@/api/finance";
import {
  useCaGstFilings,
  useCaNotices,
  useDeleteCaGstFiling,
  useDeleteCaNotice,
  type CaGstFilingDto,
  type CaNoticeDto,
} from "@/api/ca";
import {
  formatCompactCurrency,
  formatCurrency,
  FILING_STATUS_LABELS,
  NOTICE_WORKFLOW_LABELS,
} from "@/modules/ca/constants";
import type { FilingStatus, NoticeWorkflowStatus } from "@/modules/ca/types";
import {
  CAPageHeader,
  CAFilterBar,
  CaRefLink,
  CaRowActions,
  CaGstFilingFormModal,
  CaNoticeFormModal,
} from "@/modules/ca/components";
import { useCaListCrud } from "@/modules/ca/hooks/use-ca-list-crud";
import { useCaWorkingPeriod } from "@/modules/ca/hooks/use-ca-working-period";
import { usePermissions } from "@/modules/permissions/usePermission";
import { caNoticeDetailHref, caNoticesHref, financeTaxHref } from "@/modules/ca/routes";
import { filterByCaDateRange, resolveCaDateRange } from "@/modules/ca/adapters/finance";
import { toast } from "sonner";
import { toastApiError } from "@/lib/api-error";

const filingTone: Record<FilingStatus, "success" | "warning" | "danger" | "neutral"> = {
  filed: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
};

const noticeTone: Record<NoticeWorkflowStatus, "info" | "warning" | "accent" | "success"> = {
  received: "info",
  assigned: "warning",
  replied: "accent",
  closed: "success",
};

export default function Gst() {
  const { can } = usePermissions();
  const canCreate = can("ca", "create");
  const canEdit = can("ca", "edit");
  const canDelete = can("ca", "delete");
  const { dateRange, setDateRange } = useCaWorkingPeriod();
  const { taxPeriod } = resolveCaDateRange(dateRange);
  const { data: taxData } = useTaxSummary(taxPeriod);
  const { data: filingsData, isLoading: filingsLoading, isError: filingsError, refetch: refetchFilings } =
    useCaGstFilings({ limit: 100 });
  const { data: noticesData, isLoading: noticesLoading, isError: noticesError, refetch: refetchNotices } =
    useCaNotices({
      department: "gst",
      limit: 100,
    });
  const deleteFiling = useDeleteCaGstFiling();
  const deleteNotice = useDeleteCaNotice();
  const filingCrud = useCaListCrud<CaGstFilingDto>();
  const noticeCrud = useCaListCrud<CaNoticeDto>();

  const summary = taxData?.summaries?.[0];
  const gst = {
    outputTax: summary?.gstCollected ?? 0,
    inputTax: summary?.gstInputCredit ?? summary?.gstPaid ?? 0,
    netLiability: summary?.gstPayable ?? summary?.netGst ?? 0,
    period: summary?.period ?? "Current period",
  };

  const filings = useMemo(
    () => filterByCaDateRange(filingsData?.filings ?? [], dateRange),
    [filingsData?.filings, dateRange],
  );
  const notices = noticesData?.notices ?? [];

  const returnTotals = useMemo(() => {
    const gstr3b = filings.filter((f) => f.returnType === "GSTR-3B");
    const source = gstr3b.length ? gstr3b : filings;
    return source.reduce(
      (acc, f) => {
        acc.outputTax += Number(f.outputTax ?? 0);
        acc.inputTax += Number(f.inputTax ?? 0);
        acc.netTax += Number(f.netTax ?? Number(f.outputTax ?? 0) - Number(f.inputTax ?? 0));
        acc.count += 1;
        return acc;
      },
      { outputTax: 0, inputTax: 0, netTax: 0, count: 0 },
    );
  }, [filings]);

  const variance = useMemo(
    () => ({
      output: gst.outputTax - returnTotals.outputTax,
      input: gst.inputTax - returnTotals.inputTax,
      net: gst.netLiability - returnTotals.netTax,
    }),
    [gst.outputTax, gst.inputTax, gst.netLiability, returnTotals],
  );

  const penalty = useMemo(() => {
    const lateFeesAccrued = filings.reduce((s, f) => s + Number(f.lateFee ?? 0), 0);
    const interestOnDelay = filings.reduce((s, f) => s + Number(f.interest ?? 0), 0);
    const noticesOpen = notices.filter((n) => n.workflowStatus !== "closed").length;
    return { lateFeesAccrued, interestOnDelay, noticesOpen };
  }, [filings, notices]);

  const filingColumns = useMemo<CmsColumn<CaGstFilingDto>[]>(
    () => [
      {
        id: "return",
        header: "Return",
        cell: (f) => <span className="font-medium">{f.returnType}</span>,
      },
      { id: "period", header: "Period", cell: (f) => f.period },
      {
        id: "due",
        header: "Due date",
        cell: (f) => (f.dueDate ? format(new Date(f.dueDate), "MMM d, yyyy") : "—"),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (f) => (
          <CmsStatusChip label={FILING_STATUS_LABELS[f.status]} tone={filingTone[f.status]} />
        ),
      },
      {
        id: "declared",
        header: "Return net",
        align: "right",
        cell: (f) => (
          <span className="tabular-nums text-muted-foreground">
            {formatCurrency(Number(f.netTax ?? Number(f.outputTax ?? 0) - Number(f.inputTax ?? 0)))}
          </span>
        ),
      },
      {
        id: "filed",
        header: "Filed on",
        cell: (f) => (
          <span className="text-muted-foreground">
            {f.filedAt ? format(new Date(f.filedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (f) => (
          <CaRowActions
            canView
            canEdit={canEdit}
            canDelete={canDelete}
            onView={() => filingCrud.openView(f)}
            onEdit={() => filingCrud.openEdit(f)}
            onDelete={() => filingCrud.setDeleteTarget(f)}
          />
        ),
      },
    ],
    [canEdit, canDelete, filingCrud],
  );

  const noticeColumns = useMemo<CmsColumn<CaNoticeDto>[]>(
    () => [
      {
        id: "reference",
        header: "Reference",
        cell: (n) => (
          <CaRefLink href={caNoticeDetailHref(n.reference)} mono>
            {n.reference}
          </CaRefLink>
        ),
      },
      {
        id: "subject",
        header: "Subject",
        cell: (n) => (
          <CaRefLink href={caNoticeDetailHref(n.reference)} className="max-w-[220px] truncate block">
            {n.subject}
          </CaRefLink>
        ),
      },
      {
        id: "received",
        header: "Received",
        cell: (n) => (
          <span className="text-muted-foreground">
            {n.receivedAt ? format(new Date(n.receivedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (n) => (
          <CmsStatusChip
            label={NOTICE_WORKFLOW_LABELS[n.workflowStatus]}
            tone={noticeTone[n.workflowStatus]}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (n) => (
          <div onClick={(e) => e.stopPropagation()}>
            <CaRowActions
              canView
              canEdit={canEdit}
              canDelete={canDelete}
              onView={() => noticeCrud.openView(n)}
              onEdit={() => noticeCrud.openEdit(n)}
              onDelete={() => noticeCrud.setDeleteTarget(n)}
            />
          </div>
        ),
      },
    ],
    [canEdit, canDelete, noticeCrud],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="GST management"
        description="Output vs input tax from Finance — GSTR filings and notices in CA"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "GST" }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <Link href={financeTaxHref()}>
                Tax in Finance
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            </Button>
            {canCreate ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={filingCrud.openCreate}>
                <Plus className="h-3.5 w-3.5" /> Add filing
              </Button>
            ) : null}
          </div>
        }
      />
      <CAFilterBar dateRange={dateRange} onDateRangeChange={setDateRange} />
      <PortalKpiGrid
        columns={3}
        items={[
          { title: "Books · Output tax", value: formatCompactCurrency(gst.outputTax), icon: Receipt, accent: "blue", delay: 0 },
          { title: "Books · Input credit", value: formatCompactCurrency(gst.inputTax), icon: Receipt, accent: "green", delay: 1 },
          {
            title: "Books · Net liability",
            value: formatCompactCurrency(gst.netLiability),
            icon: Receipt,
            accent: "amber",
            alert: true,
            delay: 2,
          },
        ]}
      />

      <Card className={Math.abs(variance.net) > 1 ? "border-amber-500/40" : undefined}>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm">Books vs return variance</CardTitle>
          <p className="text-xs text-muted-foreground">
            Finance tax summary vs declared amounts on GSTR-3B filings in this period
            {returnTotals.count ? ` (${returnTotals.count} filing${returnTotals.count === 1 ? "" : "s"})` : " — enter return amounts on filings"}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase">Output variance</p>
              <p className={`font-semibold tabular-nums ${Math.abs(variance.output) > 1 ? "text-amber-700" : ""}`}>
                {formatCurrency(variance.output)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Books {formatCurrency(gst.outputTax)} − Return {formatCurrency(returnTotals.outputTax)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase">Input variance</p>
              <p className={`font-semibold tabular-nums ${Math.abs(variance.input) > 1 ? "text-amber-700" : ""}`}>
                {formatCurrency(variance.input)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Books {formatCurrency(gst.inputTax)} − Return {formatCurrency(returnTotals.inputTax)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase">Net variance</p>
              <p className={`font-bold tabular-nums ${Math.abs(variance.net) > 1 ? "text-red-600" : "text-emerald-700"}`}>
                {formatCurrency(variance.net)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Books {formatCurrency(gst.netLiability)} − Return {formatCurrency(returnTotals.netTax)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] uppercase text-muted-foreground">Late fees</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-lg font-bold">
            {formatCurrency(penalty.lateFeesAccrued)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] uppercase text-muted-foreground">Interest on delay</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-lg font-bold text-amber-700">
            {formatCurrency(penalty.interestOnDelay)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] uppercase text-muted-foreground">Open notices</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <Link href={caNoticesHref({ department: "gst" })} className="text-lg font-bold text-red-600 hover:underline">
              {penalty.noticesOpen}
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Return filings — {gst.period}
        </p>
        <CmsDataTable
          columns={filingColumns}
          rows={filings}
          rowKey={(f) => f.id}
          isLoading={filingsLoading}
          error={filingsError}
          onRetry={() => void refetchFilings()}
          empty={{
            icon: Receipt,
            title: "No GST filings yet",
            description: "Add a GST return filing to track status.",
            actionLabel: canCreate ? "Add filing" : undefined,
            onAction: canCreate ? filingCrud.openCreate : undefined,
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="px-1 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> GST notices
          </p>
          <div className="flex items-center gap-1">
            {canCreate ? (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={noticeCrud.openCreate}>
                <Plus className="h-3 w-3" /> Add notice
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" asChild>
              <Link href={caNoticesHref({ department: "gst" })}>
                View all <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            </Button>
          </div>
        </div>
        <CmsDataTable
          columns={noticeColumns}
          rows={notices}
          rowKey={(n) => n.id}
          isLoading={noticesLoading}
          error={noticesError}
          onRetry={() => void refetchNotices()}
          empty={{
            icon: AlertCircle,
            title: "No GST notices",
            description: "Track GSTN / department correspondence here.",
            actionLabel: canCreate ? "Add notice" : "Open notices",
            onAction: canCreate
              ? noticeCrud.openCreate
              : () => {
                  window.location.href = caNoticesHref({ department: "gst" });
                },
          }}
        />
      </div>

      <CaGstFilingFormModal
        open={filingCrud.dialogOpen}
        onOpenChange={filingCrud.closeDialog}
        editing={filingCrud.editing}
        readOnly={filingCrud.readOnly}
    />
      <CaNoticeFormModal
        open={noticeCrud.dialogOpen}
        onOpenChange={noticeCrud.closeDialog}
        editing={noticeCrud.editing}
        readOnly={noticeCrud.readOnly}
        defaultDepartment="gst"
        lockDepartment />
      <CmsConfirmDialog
        open={!!filingCrud.deleteTarget}
        onOpenChange={(open) => !open && filingCrud.setDeleteTarget(null)}
        title="Delete GST filing?"
        description="This soft-deletes the GST filing record."
        loading={deleteFiling.isPending}
        onConfirm={() => {
          if (!filingCrud.deleteTarget) return;
          deleteFiling.mutate(filingCrud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("GST filing deleted");
              filingCrud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete GST filing"),
          });
        }}
      />
      <CmsConfirmDialog
        open={!!noticeCrud.deleteTarget}
        onOpenChange={(open) => !open && noticeCrud.setDeleteTarget(null)}
        title="Delete GST notice?"
        description="This soft-deletes the notice record."
        loading={deleteNotice.isPending}
        onConfirm={() => {
          if (!noticeCrud.deleteTarget) return;
          deleteNotice.mutate(noticeCrud.deleteTarget.id, {
            onSuccess: () => {
              toast.success("Notice deleted");
              noticeCrud.setDeleteTarget(null);
            },
            onError: (err) => toastApiError(err, "Could not delete notice"),
          });
        }}
      />
    </PortalPageShell>
  );
}
