import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Banknote,
  Download,
  Layers,
  Loader2,
  MoreHorizontal,
  Play,
  RefreshCw,
  Wallet,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageShell } from "@/modules/hrm/components";
import { HrmPersonChip } from "@/modules/hrm/rich-ui-kit";
import { HrmRefDetailRow, HrmRefDetailSection } from "@/modules/hrm/hrm-reference-kit";
import {
  PayPeriodNavigator,
  PayPeriodSummary,
  PayrollFilterBar,
  HrmPayrollExplorer,
  OrgPayrollKpis,
  payrollStatusPill,
  currentPayrollPeriod,
  deriveRunStatusFromPayrollRun,
  formatPayrollPeriodLabel,
  estimateTotalsFromStructures,
  totalsFromOrgOverview,
  totalsFromPayrollLines,
  type PayrollStatusFilter,
} from "@/modules/hrm/payroll-satyakabir-ui";
import { isCurrentPayrollPeriod } from "@/modules/hrm/payroll-period-utils";
import { PayrollReadinessBanner, payrollSelectTriggerClass } from "@/modules/hrm/payroll-kit";
import { HrmPayslipPreviewPanel } from "@/modules/hrm/HrmPayslipPreviewPanel";
import { HrmPayslipDownloadButton } from "@/modules/hrm/HrmPayslipDownloadButton";
import { inrMoney } from "@/modules/hrm/payslip-view-model";
import {
  payrollExportUrl,
  payrollBankExportUrl,
  useFinalizePayrollRun,
  useMarkPayrollRunPaid,
  useRevertPayrollRun,
  useRegeneratePayslips,
  useGeneratePayrollRun,
  useHrmPayrollChecklistByPeriod,
  useHrmPayrollRunLines,
  useHrmPayrollRuns,
  useHrmSalaryStructures,
  useHrmPayrollOrgOverview,
  useHrmEmployees,
  useReviewPayrollRun,
  useUpdatePayrollLine,
  useUpsertSalaryStructure,
} from "@/api/hrm";
import { getAccessToken } from "@/lib/auth-storage";
import { getResponseErrorMessage, isApiError } from "@/lib/api-error";
import type { HrmPayrollChecklist, HrmPayrollLine, HrmSalaryStructure } from "@/modules/hrm/types";
import { LEGACY_PAYROLL_LABELS } from "@/modules/hrm/hrm-legacy-labels";

export default function HrmPayrollPage() {
  const [period, setPeriod] = useState(currentPayrollPeriod);
  const [runId, setRunId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<PayrollStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [structuresOpen, setStructuresOpen] = useState(false);
  const [finalizeConfirmOpen, setFinalizeConfirmOpen] = useState(false);
  const [payAllConfirmOpen, setPayAllConfirmOpen] = useState(false);
  const [structEmployeeKey, setStructEmployeeKey] = useState("");
  const [structBasic, setStructBasic] = useState("");
  const [structHra, setStructHra] = useState("");
  const [structAllowances, setStructAllowances] = useState("");
  const [structPfEmployee, setStructPfEmployee] = useState("");
  const [structTds, setStructTds] = useState("");
  const [structBankName, setStructBankName] = useState("");
  const [structAccountNumber, setStructAccountNumber] = useState("");
  const [structIfsc, setStructIfsc] = useState("");
  const [structPan, setStructPan] = useState("");
  const [structBankHints, setStructBankHints] = useState({
    bankName: "",
    accountNumber: "",
    ifsc: "",
    pan: "",
  });

  const { data: runs, refetch: refetchRuns, isFetching: runsFetching } = useHrmPayrollRuns();
  const { data: lines, refetch: refetchLines, isFetching: linesFetching } = useHrmPayrollRunLines(runId);
  const {
    data: checklist,
    isLoading: checklistLoading,
    isFetching: checklistFetching,
    refetch: refetchChecklist,
  } = useHrmPayrollChecklistByPeriod(period.year, period.month);
  const { data: structures, isError: structuresError } = useHrmSalaryStructures();
  const { data: orgOverview, isLoading: orgOverviewLoading, refetch: refetchOrgOverview } = useHrmPayrollOrgOverview();
  const { data: employeesData } = useHrmEmployees(
    { status: "active", limit: 500 },
    { enabled: structuresOpen },
  );
  const generate = useGeneratePayrollRun();
  const finalize = useFinalizePayrollRun();
  const revert = useRevertPayrollRun();
  const regenerate = useRegeneratePayslips();
  const markPaid = useMarkPayrollRunPaid();
  const review = useReviewPayrollRun();
  const updateLine = useUpdatePayrollLine();
  const upsertStructure = useUpsertSalaryStructure();

  const selectedRun = (runs?.runs ?? []).find((r) => r.id === runId);
  const runStatus = selectedRun?.status;
  const isDraft = runStatus === "draft";
  const isReviewed = runStatus === "reviewed";
  const isFinalized = runStatus === "finalized";
  const isPaid = runStatus === "paid";
  const nowPeriod = currentPayrollPeriod();
  const isFuturePeriod =
    period.year > nowPeriod.year ||
    (period.year === nowPeriod.year && period.month > nowPeriod.month);
  const payrollBlocked = checklist ? !checklist.ready : false;
  const canRunPayroll =
    !checklistLoading && !payrollBlocked && (!selectedRun || isDraft) && !generate.isPending;

  useEffect(() => {
    const match = (runs?.runs ?? []).find((r) => r.year === period.year && r.month === period.month);
    setRunId(match?.id);
  }, [runs, period.year, period.month]);

  const lineRows = lines?.lines ?? [];
  const structureRows = structures?.structures ?? [];
  const employeeOptions = employeesData?.employees ?? [];
  const missingStructureBlocker = checklist?.blockers.find((b) => b.code === "missing_salary_structure");

  useEffect(() => {
    if (!structuresOpen || structEmployeeKey) return;
    const firstMissing = missingStructureBlocker?.items?.[0];
    if (firstMissing?.userId != null) setStructEmployeeKey(String(firstMissing.userId));
  }, [structuresOpen, structEmployeeKey, missingStructureBlocker]);

  useEffect(() => {
    if (!structuresOpen || !structEmployeeKey) return;
    const row = structureRows.find((s) => String(s.userId) === structEmployeeKey);
    if (!row) {
      setStructBasic("");
      setStructHra("");
      setStructAllowances("");
      setStructPfEmployee("");
      setStructTds("");
      setStructBankName("");
      setStructAccountNumber("");
      setStructIfsc("");
      setStructPan("");
      setStructBankHints({ bankName: "", accountNumber: "", ifsc: "", pan: "" });
      return;
    }
    setStructBasic(row.basic != null ? String(row.basic) : "");
    setStructHra(row.hra != null ? String(row.hra) : "");
    setStructAllowances(row.allowances != null ? String(row.allowances) : "");
    setStructPfEmployee(row.pfEmployee != null ? String(row.pfEmployee) : "");
    setStructTds(row.tds != null ? String(row.tds) : "");
    setStructBankName("");
    setStructAccountNumber("");
    setStructIfsc("");
    setStructPan("");
    setStructBankHints({
      bankName: row.bankNameMasked ?? "",
      accountNumber: row.bankAccountMasked ?? "",
      ifsc: row.ifscMasked ?? "",
      pan: row.panMasked ?? "",
    });
  }, [structuresOpen, structEmployeeKey, structureRows]);

  const totals = useMemo(() => {
    if (lineRows.length > 0) return totalsFromPayrollLines(lineRows, isPaid);
    if (isFuturePeriod) {
      return {
        employeeCount: 0,
        totalNet: 0,
        contractPay: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paidCount: 0,
        pendingCount: 0,
      };
    }
    if (orgOverview) return totalsFromOrgOverview(orgOverview);
    return estimateTotalsFromStructures(structureRows);
  }, [lineRows, isPaid, isFuturePeriod, orgOverview, structureRows]);

  const filteredLines = useMemo(() => {
    let rows = lineRows;
    if (statusFilter === "PAID") rows = isPaid ? rows : [];
    if (statusFilter === "UNPAID") rows = !isPaid ? rows : [];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (l) =>
          (l.employeeName ?? "").toLowerCase().includes(q) ||
          (l.employeeId ?? "").toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => (a.employeeName ?? "").localeCompare(b.employeeName ?? ""));
  }, [lineRows, statusFilter, search, isPaid]);

  const runPeriodStatus = deriveRunStatusFromPayrollRun(
    selectedRun?.status,
    totals.employeeCount,
  );
  const periodLabel = formatPayrollPeriodLabel(period.month, period.year);

  const handleRefresh = () => {
    void refetchRuns();
    void refetchLines();
    void refetchChecklist();
    void refetchOrgOverview();
  };

  const extractChecklistFromError = (error: unknown): HrmPayrollChecklist | undefined => {
    if (!isApiError(error)) return undefined;
    const data = error.data as { checklist?: HrmPayrollChecklist; details?: { checklist?: HrmPayrollChecklist } } | null;
    return data?.checklist ?? data?.details?.checklist;
  };

  const handleExport = async () => {
    if (!runId) {
      toast.error("Generate payroll for this period first");
      return;
    }
    const token = getAccessToken();
    const res = await fetch(payrollExportUrl(runId), {
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

  const handleBankExport = async () => {
    if (!runId || !selectedRun || !["finalized", "paid"].includes(selectedRun.status)) {
      toast.error("Finalize payroll before exporting bank transfer file");
      return;
    }
    const token = getAccessToken();
    const res = await fetch(payrollBankExportUrl(runId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      toast.error(await getResponseErrorMessage(res, "Bank export failed"));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-bank-${period.month}-${period.year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunPayroll = () => {
    if (!canRunPayroll) {
      toast.error(payrollBlocked ? "Resolve blockers before running payroll" : "Cannot run payroll for this period");
      return;
    }
    generate.mutate(
      { year: period.year, month: period.month },
      {
        onSuccess: (r) => {
          setRunId(r.id);
          toast.success("Payroll run generated");
          void refetchChecklist();
        },
        onError: (error) => {
          if (extractChecklistFromError(error)) void refetchChecklist();
          toast.error("Could not generate payroll");
        },
      },
    );
  };

  const resetStructureForm = () => {
    setStructEmployeeKey("");
    setStructBasic("");
    setStructHra("");
    setStructAllowances("");
    setStructPfEmployee("");
    setStructTds("");
    setStructBankName("");
    setStructAccountNumber("");
    setStructIfsc("");
    setStructPan("");
    setStructBankHints({ bankName: "", accountNumber: "", ifsc: "", pan: "" });
  };

  const handleSaveStructure = () => {
    const userId = Number(structEmployeeKey);
    const basic = Number(structBasic);
    if (!Number.isFinite(userId) || userId < 1) {
      toast.error("Select an employee first");
      return;
    }
    if (!Number.isFinite(basic) || basic <= 0) {
      toast.error("Enter a valid basic salary (must be greater than 0)");
      return;
    }
    upsertStructure.mutate(
      {
        userId,
        basic,
        hra: Number(structHra) || 0,
        allowances: Number(structAllowances) || 0,
        pfEmployee: Number(structPfEmployee) || 0,
        tds: Number(structTds) || 0,
        ...(structBankName.trim() ? { bankName: structBankName.trim() } : {}),
        ...(structAccountNumber.trim() ? { bankAccountNumber: structAccountNumber.trim() } : {}),
        ...(structIfsc.trim() ? { ifscCode: structIfsc.trim() } : {}),
        ...(structPan.trim() ? { panNumber: structPan.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Salary structure saved");
          resetStructureForm();
          void refetchChecklist();
        },
      },
    );
  };

  const lineIsPaid = useCallback(() => isPaid, [isPaid]);
  const isRefreshing = runsFetching || linesFetching || checklistFetching;

  return (
    <HrmGate module="payroll">
      <HrmPageShell className="space-y-4">
        <OrgPayrollKpis
          totalActive={orgOverview?.totalActive ?? 0}
          configuredCount={orgOverview?.configuredCount ?? 0}
          monthlyCommitmentNet={orgOverview?.monthlyCommitmentNet ?? 0}
          avgNetSalary={orgOverview?.avgNetSalary ?? 0}
          notConfiguredCount={orgOverview?.notConfiguredCount ?? 0}
          loading={orgOverviewLoading}
        />

        <PayPeriodNavigator
          period={period}
          onChange={(next) => {
            setPeriod(next);
            setStatusFilter("ALL");
            setSearch("");
          }}
          runStatus={runPeriodStatus}
          payrollRunStatus={selectedRun?.status}
        />

        {isCurrentPayrollPeriod(period) && !isPaid ? (
          <p className="text-xs text-muted-foreground rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            Current-month payroll uses attendance through today only. Re-run after month-end for full-period amounts.
          </p>
        ) : isFuturePeriod ? (
          <p className="text-xs text-muted-foreground rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
            Future payroll periods do not have attendance yet, so this view stays empty until that month begins or a run is created.
          </p>
        ) : null}

        <PayPeriodSummary
          totalEmployees={totals.employeeCount}
          totalPay={totals.totalNet}
          totalContractPay={totals.contractPay}
          paidAmount={totals.paidAmount}
          pendingAmount={totals.pendingAmount}
          paidCount={totals.paidCount}
          pendingCount={totals.pendingCount}
        />

        <PayrollReadinessBanner
          checklist={checklist}
          loading={checklistLoading || (checklistFetching && !checklist)}
          onOpenPayrollSettings={() => setStructuresOpen(true)}
        />

        <HrmPayrollExplorer<HrmPayrollLine>
          title="Employee payslips"
          subtitle={`${periodLabel} · review, disburse, and download`}
          data={filteredLines}
          getId={(r) => String(r.id)}
          emptyHint={
            lineRows.length === 0
              ? "No payroll for this period yet — run payroll to generate employee slips."
              : "No employees match your filters."
          }
          actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={handleRunPayroll}
                  disabled={!canRunPayroll}
                >
                  {generate.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  {isDraft ? "Re-run payroll" : "Run payroll"}
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleRefresh} disabled={isRefreshing}>
                  <RefreshCw className={isRefreshing ? "size-3.5 animate-spin" : "size-3.5"} />
                  Refresh
                </Button>
                {isFinalized && runId && (
                  <Button
                    size="sm"
                    className="h-8 gap-1.5"
                    disabled={markPaid.isPending}
                    onClick={() => setPayAllConfirmOpen(true)}
                  >
                    {markPaid.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Banknote className="size-3.5" />
                    )}
                    Pay all
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isDraft && runId && (
                      <DropdownMenuItem onClick={() => review.mutate(runId, { onSuccess: () => toast.success("Marked reviewed") })}>
                        Mark reviewed
                      </DropdownMenuItem>
                    )}
                    {(isDraft || isReviewed) && runId && (
                      <DropdownMenuItem onClick={() => setFinalizeConfirmOpen(true)}>
                        Finalize & publish payslips
                      </DropdownMenuItem>
                    )}
                    {isFinalized && runId && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          revert.mutate(runId, {
                            onSuccess: () => toast.success("Payroll reverted to reviewed — you can now edit and re-finalize"),
                          })
                        }
                      >
                        Revert finalization
                      </DropdownMenuItem>
                    )}
                    {runId && (isFinalized || isPaid) && (
                      <DropdownMenuItem
                        onClick={() =>
                          regenerate.mutate(runId, {
                            onSuccess: () => toast.success("Payslips regenerated with latest template"),
                          })
                        }
                        disabled={regenerate.isPending}
                      >
                        Regenerate payslips
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => void handleExport()}>
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </DropdownMenuItem>
                    {runId && selectedRun && ["finalized", "paid"].includes(selectedRun.status) && (
                      <DropdownMenuItem onClick={() => void handleBankExport()}>
                        <Download className="mr-2 h-4 w-4" />
                        Export bank transfer CSV
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStructuresOpen(true)}>
                      <Layers className="mr-2 h-4 w-4" />
                      Salary structures
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/hrm/salary-slips">Open salary slip archive</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            }
            filterBar={
              <PayrollFilterBar
                status={statusFilter}
                onStatusChange={setStatusFilter}
                search={search}
                onSearchChange={setSearch}
                counts={{
                  all: lineRows.length,
                  paid: isPaid ? lineRows.length : 0,
                  unpaid: !isPaid ? lineRows.length : 0,
                }}
              />
            }
            renderCard={(r) => (
              <div className="space-y-2">
                <HrmPersonChip
                  name={r.employeeName ?? `User #${r.userId}`}
                  subtitle={r.employeeId ?? undefined}
                  avatarUrl={r.employeeAvatarUrl}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold tabular-nums text-primary">{inrMoney(r.net)}</span>
                  {payrollStatusPill(lineIsPaid())}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {r.paidDays} paid · {r.lopDays} LOP
                </p>
              </div>
            )}
            columns={[
              {
                key: "emp",
                header: "Employee",
                render: (r) => (
                  <HrmPersonChip
                    name={r.employeeName ?? `User #${r.userId}`}
                    subtitle={r.employeeId ?? undefined}
                    avatarUrl={r.employeeAvatarUrl}
                    href={`/hrm/employees/${r.userId}`}
                  />
                ),
              },
              {
                key: "totalSalary",
                header: "Contract pay",
                className: "text-right",
                render: (r) => (
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {r.totalSalary != null && r.totalSalary > 0 ? inrMoney(r.totalSalary) : "—"}
                  </span>
                ),
              },
              {
                key: "gross",
                header: "Earned",
                className: "text-right",
                render: (r) => <span className="text-xs tabular-nums">{inrMoney(r.gross)}</span>,
              },
              {
                key: "deductions",
                header: "Deductions",
                className: "text-right",
                render: (r) => (
                  <span className="text-xs tabular-nums text-destructive">
                    {r.deductions > 0 ? `−${inrMoney(r.deductions)}` : "—"}
                  </span>
                ),
              },
              {
                key: "net",
                header: "Net pay",
                className: "text-right",
                render: (r) => (
                  <span className="text-xs font-bold tabular-nums text-primary">{inrMoney(r.net)}</span>
                ),
              },
              {
                key: "att",
                header: "Attendance",
                render: (r) => (
                  <span className="text-[10px] text-muted-foreground">
                    {r.paidDays} paid · {r.lopDays} LOP
                  </span>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: () => payrollStatusPill(lineIsPaid()),
              },
              {
                key: "dl",
                header: "",
                className: "text-right w-16",
                render: (r) =>
                  r.payslipId ? <HrmPayslipDownloadButton payslipId={r.payslipId} /> : null,
              },
            ]}
            detailTitle={(r) => r.employeeName ?? `User #${r.userId}`}
            detailSubtitle={() => `Payslip · ${periodLabel}`}
            detailSheetClassName="w-full overflow-y-auto sm:max-w-4xl"
            renderDetail={(r) => (
              <>
                <div className="flex items-center justify-between gap-3">
                  <HrmPersonChip
                    name={r.employeeName ?? `User #${r.userId}`}
                    subtitle={r.employeeId ?? undefined}
                  />
                  {payrollStatusPill(lineIsPaid())}
                </div>
                <HrmRefDetailSection title="Pay breakdown" className="mt-4">
                  <HrmRefDetailRow label="Period" value={periodLabel} />
                  <HrmRefDetailRow
                    label="Attendance"
                    value={`${r.paidDays} paid · ${r.lopDays} LOP${(r.lateCount ?? 0) > 0 ? ` · ${r.lateCount} late` : ""}`}
                  />
                  <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                    {r.totalSalary != null && r.totalSalary > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contract pay (net)</span>
                        <span className="tabular-nums text-muted-foreground">{inrMoney(r.totalSalary)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Earned ({r.paidDays}d)</span>
                      <span className="font-medium tabular-nums">{inrMoney(r.gross)}</span>
                    </div>
                    {(r.pfEmployee ?? 0) > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>PF (employee)</span>
                        <span className="tabular-nums text-destructive">−{inrMoney(r.pfEmployee!)}</span>
                      </div>
                    )}
                    {(r.tds ?? 0) > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>TDS</span>
                        <span className="tabular-nums text-destructive">−{inrMoney(r.tds!)}</span>
                      </div>
                    )}
                    {(r.lopDeduction ?? 0) > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>LOP deduction ({r.lopDays}d)</span>
                        <span className="tabular-nums text-destructive">−{inrMoney(r.lopDeduction!)}</span>
                      </div>
                    )}
                    {(r.latePenalty ?? 0) > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Late penalty ({r.lateCount} late{r.lateCount === 1 ? "" : "s"})</span>
                        <span className="tabular-nums text-destructive">−{inrMoney(r.latePenalty!)}</span>
                      </div>
                    )}
                    {r.deductions > 0 && (
                      <div className="flex justify-between border-t border-border/40 pt-1.5 text-sm">
                        <span className="text-muted-foreground">Total deductions</span>
                        <span className="font-medium tabular-nums text-destructive">−{inrMoney(r.deductions)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-1.5 text-sm font-bold">
                      <span>Net pay</span>
                      <span className="tabular-nums text-primary">{inrMoney(r.net)}</span>
                    </div>
                  </div>
                </HrmRefDetailSection>
                {isDraft ? (
                  <div className="mt-4">
                    <label className="text-xs font-medium text-muted-foreground">LOP days</label>
                    <Input
                      type="number"
                      className="mt-1 w-24 h-8"
                      defaultValue={r.lopDays}
                      onBlur={(e) => {
                        const lopDays = Number(e.target.value);
                        if (Number.isNaN(lopDays) || lopDays === r.lopDays) return;
                        updateLine.mutate(
                          { lineId: r.id, lopDays },
                          {
                            onSuccess: () => {
                              toast.success("LOP updated");
                              void refetchLines();
                            },
                          },
                        );
                      }}
                    />
                  </div>
                ) : null}
                <div className="mt-4 min-w-0">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Payslip
                  </p>
                  <HrmPayslipPreviewPanel payslipId={r.payslipId} showDownload={false} />
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {isFinalized && runId && (
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      disabled={markPaid.isPending}
                      onClick={() => setPayAllConfirmOpen(true)}
                    >
                      <Check className="size-3.5" />
                      Pay all for this period
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
                    <Link href={`/hrm/employees/${r.userId}`}>
                      <Wallet className="size-3.5" />
                      View employee
                    </Link>
                  </Button>
                  {r.payslipId ? (
                    <div className="flex justify-center pt-1">
                      <HrmPayslipDownloadButton payslipId={r.payslipId} />
                    </div>
                  ) : null}
                </div>
              </>
            )}
          />

        <Dialog open={structuresOpen} onOpenChange={setStructuresOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{LEGACY_PAYROLL_LABELS.structuresTitle}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Use when the team employee profile has no basic salary. Prefer Admin → Team → Compensation for
                primary pay setup. PF/TDS here apply only when payroll falls back to this structure.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              {structuresError && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Could not load salary structures. Please try closing and reopening this dialog.
                </p>
              )}
              <div className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">{LEGACY_PAYROLL_LABELS.employee}</label>
                  <Select value={structEmployeeKey} onValueChange={setStructEmployeeKey}>
                    <SelectTrigger className={payrollSelectTriggerClass}>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeOptions.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name}
                          {e.employeeId ? ` (${e.employeeId})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {[
                  { label: LEGACY_PAYROLL_LABELS.basic, value: structBasic, set: setStructBasic, type: "number" as const },
                  { label: LEGACY_PAYROLL_LABELS.hra, value: structHra, set: setStructHra, type: "text" as const },
                  { label: LEGACY_PAYROLL_LABELS.allowances, value: structAllowances, set: setStructAllowances, type: "text" as const },
                  { label: LEGACY_PAYROLL_LABELS.pfEmployee, value: structPfEmployee, set: setStructPfEmployee, type: "text" as const },
                  { label: LEGACY_PAYROLL_LABELS.tds, value: structTds, set: setStructTds, type: "text" as const },
                ].map((field) => (
                  <div key={field.label} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                    <Input
                      type={field.type}
                      value={field.value}
                      onChange={(e) => field.set(e.target.value)}
                    />
                  </div>
                ))}
                <div className="flex items-end gap-2 sm:col-span-2">
                  <Button className="w-full sm:w-auto" disabled={upsertStructure.isPending} onClick={handleSaveStructure}>
                    {LEGACY_PAYROLL_LABELS.saveStructure}
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto" onClick={resetStructureForm}>
                    Reset
                  </Button>
                </div>
              </div>
              {structureRows.length > 0 ? (
                <Card className="p-3 text-xs text-muted-foreground">
                  {structureRows.length} salary structure(s) on file
                </Card>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={finalizeConfirmOpen} onOpenChange={setFinalizeConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finalize & publish payslips?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  This will lock the payroll for <strong>{periodLabel}</strong> and publish payslips
                  to all employees. Attendance records will be locked for this period.
                </span>
                <span className="block text-muted-foreground">
                  If you need to make corrections after finalizing, use <strong>Revert finalization</strong> from
                  the same menu — it unlocks everything so you can edit and re-finalize.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={finalize.isPending}
                onClick={() => {
                  if (!runId) return;
                  finalize.mutate(runId, {
                    onSuccess: () => {
                      toast.success("Payroll finalized — payslips published", {
                        description: "Need to make a change? Use Revert finalization from the ⋯ menu.",
                        duration: 6000,
                      });
                    },
                  });
                }}
              >
                {finalize.isPending ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : null}
                Yes, finalize
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={payAllConfirmOpen} onOpenChange={setPayAllConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pay all for {periodLabel}?</AlertDialogTitle>
              <AlertDialogDescription>
                This marks every payslip in this payroll run as paid ({totals.employeeCount} employee
                {totals.employeeCount === 1 ? "" : "s"}, {inrMoney(totals.totalNet)} total). This does not
                trigger the actual bank transfer — export the bank file first if you haven't disbursed funds yet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={markPaid.isPending}
                onClick={() => {
                  if (!runId) return;
                  markPaid.mutate(runId, {
                    onSuccess: () => {
                      toast.success("Payroll marked as paid for all employees");
                      setPayAllConfirmOpen(false);
                    },
                  });
                }}
              >
                {markPaid.isPending ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : null}
                Yes, pay all
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HrmPageShell>
    </HrmGate>
  );
}
