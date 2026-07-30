import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Archive,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CmsRowActions } from "@/components/cms";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageShell } from "@/modules/hrm/components";
import { HrmPersonChip } from "@/modules/hrm/rich-ui-kit";
import {
  PayPeriodNavigator,
  PayPeriodSummary,
  PayrollFilterBar,
  HrmPayrollExplorer,
  payrollStatusPill,
  currentPayrollPeriod,
  deriveRunStatusFromPayrollRun,
  formatPayrollPeriodLabel,
  estimateTotalsFromStructures,
  totalsFromOrgOverview,
  totalsFromPayslipRows,
  type PayrollStatusFilter,
} from "@/modules/hrm/payroll-satyakabir-ui";
import { HrmPayslipPreviewPanel } from "@/modules/hrm/HrmPayslipPreviewPanel";
import { downloadHrmPayslip } from "@/modules/hrm/HrmPayslipDownloadButton";
import { inrMoney } from "@/modules/hrm/payslip-view-model";
import { payslipPeriodLabel } from "@/modules/hrm/payslip-utils";
import {
  useAdminPayslips,
  useGeneratePayrollRun,
  useHrmPayrollRuns,
  useHrmSalaryStructures,
  useHrmPayrollOrgOverview,
  useHrmPayrollChecklistByPeriod,
} from "@/api/hrm";
import { getAccessToken } from "@/lib/auth-storage";
import { getResponseErrorMessage, toastApiError } from "@/lib/api-error";
import { payrollExportUrl } from "@/api/hrm";
import type { HrmAdminPayslipRow } from "@/modules/hrm/types";
import { PayrollReadinessBanner } from "@/modules/hrm/payroll-kit";
import { cn } from "@/lib/utils";

export default function HrmSalarySlipsPage() {
  const [archiveMode, setArchiveMode] = useState(false);
  const [period, setPeriod] = useState(currentPayrollPeriod);
  const [statusFilter, setStatusFilter] = useState<PayrollStatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const { data: runs } = useHrmPayrollRuns();
  const selectedRun = (runs?.runs ?? []).find((r) => r.year === period.year && r.month === period.month);

  const { data, isLoading, isFetching, refetch } = useAdminPayslips(
    archiveMode ? { allPeriods: true } : { year: period.year, month: period.month },
  );
  const { data: structuresData } = useHrmSalaryStructures();
  const { data: orgOverview } = useHrmPayrollOrgOverview();
  const {
    data: checklist,
    isLoading: checklistLoading,
  } = useHrmPayrollChecklistByPeriod(period.year, period.month);

  const generate = useGeneratePayrollRun();
  const rows = data?.slips ?? [];
  const structureRows = structuresData?.structures ?? [];

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter === "PAID") list = list.filter((r) => r.status === "PAID");
    if (statusFilter === "UNPAID") list = list.filter((r) => r.status === "UNPAID");
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          (r.employeeId ?? "").toLowerCase().includes(q) ||
          payslipPeriodLabel(r.month, r.year).toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, statusFilter, search]);

  const totals = useMemo(() => {
    if (rows.length > 0) return totalsFromPayslipRows(rows);
    if (orgOverview) return totalsFromOrgOverview(orgOverview);
    return estimateTotalsFromStructures(structureRows);
  }, [rows, orgOverview, structureRows]);

  const payrollBlocked = checklist ? !checklist.ready : false;
  const canRunPayroll = !archiveMode && !checklistLoading && !payrollBlocked && !generate.isPending;

  const runPeriodStatus = deriveRunStatusFromPayrollRun(selectedRun?.status, totals.employeeCount);
  const periodLabel = archiveMode ? "Full archive" : formatPayrollPeriodLabel(period.month, period.year);

  const handleExport = async () => {
    if (!selectedRun?.id) {
      toast.error("No payroll run for this period");
      return;
    }
    const token = getAccessToken();
    const res = await fetch(payrollExportUrl(selectedRun.id), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      toast.error(await getResponseErrorMessage(res, "Export failed"));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${period.month}-${period.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunPayroll = () => {
    if (payrollBlocked) {
      toast.error("Resolve payroll readiness blockers before running payroll");
      return;
    }
    generate.mutate(
      { year: period.year, month: period.month },
      {
        onSuccess: () => {
          toast.success("Payroll run generated — slips are ready");
          void refetch();
        },
      },
    );
  };

  if (isLoading) {
    return (
      <HrmGate module="payroll">
        <HrmPageShell className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </HrmPageShell>
      </HrmGate>
    );
  }

  return (
    <HrmGate module="payroll">
      <HrmPageShell className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Salary slips</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview and download employee payslips by pay period
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
            <Link href="/hrm/payroll">
              <ExternalLink className="size-3.5" />
              Payroll processing
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={archiveMode ? "outline" : "default"}
            className="h-8"
            onClick={() => setArchiveMode(false)}
          >
            By pay period
          </Button>
          <Button
            type="button"
            size="sm"
            variant={archiveMode ? "default" : "outline"}
            className="h-8 gap-1.5"
            onClick={() => setArchiveMode(true)}
          >
            <Archive className="size-3.5" />
            Full archive
          </Button>
          {archiveMode ? (
            <Badge variant="secondary" className="text-[10px]">
              {rows.length} slips across all periods
            </Badge>
          ) : null}
        </div>

        {!archiveMode ? (
          <>
            <PayPeriodNavigator
              period={period}
              onChange={setPeriod}
              runStatus={runPeriodStatus}
              payrollRunStatus={selectedRun?.status}
            />
            <PayPeriodSummary
              totalEmployees={totals.employeeCount}
              totalPay={totals.totalNet}
              totalContractPay={totals.contractPay}
              paidAmount={totals.paidAmount}
              pendingAmount={totals.pendingAmount}
              paidCount={totals.paidCount}
              pendingCount={totals.pendingCount}
            />
            <PayrollReadinessBanner checklist={checklist} loading={checklistLoading} />
          </>
        ) : null}

        <HrmPayrollExplorer<HrmAdminPayslipRow>
          title={archiveMode ? "Payslip archive" : "Payslips"}
          subtitle={
            archiveMode
              ? "All generated payslips — click a row to preview"
              : `${periodLabel} · click a row for full slip preview`
          }
          data={filtered}
          getId={(r) => String(r.id)}
          emptyHint={
            !archiveMode && rows.length === 0
              ? "No payslips for this period — run payroll from Payroll processing first."
              : "No slips match your filters."
          }
          actions={
            <div className="flex flex-wrap gap-2">
              {!archiveMode && rows.length === 0 ? (
                <Button size="sm" className="h-8" onClick={handleRunPayroll} disabled={!canRunPayroll}>
                  {generate.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Run payroll
                </Button>
              ) : null}
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void refetch()}>
                <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
                Refresh
              </Button>
              {!archiveMode && selectedRun ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => void handleExport()}
                  disabled={rows.length === 0}
                >
                  <FileSpreadsheet className="size-3.5" />
                  Export
                </Button>
              ) : null}
            </div>
          }
          filterBar={
            <PayrollFilterBar
              status={statusFilter}
              onStatusChange={setStatusFilter}
              search={search}
              onSearchChange={setSearch}
              counts={{ all: rows.length, paid: totals.paidCount, unpaid: totals.pendingCount }}
            />
          }
          renderCard={(r) => (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {payslipPeriodLabel(r.month, r.year)}
              </p>
              <HrmPersonChip
                name={r.employeeName}
                subtitle={[r.employeeId, r.designation].filter(Boolean).join(" · ") || undefined}
                avatarUrl={r.employeeAvatarUrl}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold tabular-nums text-primary">
                  {r.net != null ? inrMoney(r.net) : "—"}
                </span>
                {payrollStatusPill(r.status === "PAID")}
              </div>
            </div>
          )}
          columns={[
            {
              key: "period",
              header: "Pay period",
              render: (r) => (
                <span className="text-xs font-semibold">{payslipPeriodLabel(r.month, r.year)}</span>
              ),
            },
            {
              key: "emp",
              header: "Employee",
              render: (r) => (
                <HrmPersonChip
                  name={r.employeeName}
                  subtitle={
                    [r.employeeId, r.designation].filter(Boolean).join(" · ") || undefined
                  }
                  avatarUrl={r.employeeAvatarUrl}
                  href={`/hrm/employees/${r.userId}`}
                />
              ),
            },
            {
              key: "net",
              header: "Net pay",
              className: "text-right",
              render: (r) => (
                <span className="text-xs font-bold tabular-nums text-primary">
                  {r.net != null ? inrMoney(r.net) : "—"}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => payrollStatusPill(r.status === "PAID"),
            },
            {
              key: "actions",
              header: "Actions",
              className: "text-right w-14",
              render: (r) => (
                <div data-stop-row-click>
                  <CmsRowActions
                    label="Payslip actions"
                    items={[
                      {
                        label: "Download PDF",
                        icon: Download,
                        onSelect: () => {
                          void downloadHrmPayslip(r.id).catch((err) =>
                            toastApiError(err, "Could not download payslip"),
                          );
                        },
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
          detailTitle={(r) => r.employeeName}
          detailSubtitle={(r) => payslipPeriodLabel(r.month, r.year)}
          detailSheetClassName="w-full overflow-y-auto sm:max-w-4xl"
          renderDetail={(r) => <HrmPayslipPreviewPanel payslipId={r.id} />}
        />
      </HrmPageShell>
    </HrmGate>
  );
}
