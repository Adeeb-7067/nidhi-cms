import { useEffect, useMemo, useState } from "react";
import { format, endOfMonth, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { getResponseErrorMessage } from "@/lib/api-error";
import {
  Download,
  Layers,
  MoreHorizontal,
  Play,
  RefreshCw,
  Search,
  FileText,
  IndianRupee,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { AdvancedTable, type Column } from "@/components/ui/advanced-table";
import { PortalTablePanel } from "@/components/layout/portal-page-kit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HrmGate } from "@/modules/hrm/HrmGate";
import {
  HrmPageShell,
} from "@/modules/hrm/components";
import {
  PayPeriodHeader,
  PayrollMetricCard,
  PayrollDisbursementProgress,
  PayrollReadinessBanner,
  formatPayrollAmount,
  payrollLineStatus,
  payrollOutlineButtonClass,
  payrollPanelClass,
  payrollRunButtonClass,
  payrollIconButtonClass,
  payrollSelectTriggerClass,
  payrollTabsListClass,
  payrollTabsTriggerClass,
  isLinePaid,
  isLinePending,
} from "@/modules/hrm/payroll-kit";
import {
  payrollExportUrl,
  payrollBankExportUrl,
  useFinalizePayrollRun,
  useMarkPayrollRunPaid,
  useGeneratePayrollRun,
  useHrmPayrollChecklistByPeriod,
  useHrmPayrollRunLines,
  useHrmPayrollRuns,
  useHrmSalaryStructures,
  useHrmEmployees,
  useReviewPayrollRun,
  useUpdatePayrollLine,
  useUpsertSalaryStructure,
} from "@/api/hrm";
import { getAccessToken } from "@/lib/auth-storage";
import { isApiError } from "@/lib/api-error";
import { DEFAULT_TABLE_PAGE_SIZE, useClientPagination } from "@/lib/table-pagination";
import { cn } from "@/lib/utils";
import type { HrmPayrollChecklist, HrmPayrollLine, HrmSalaryStructure } from "@/modules/hrm/types";
import { LEGACY_PAYROLL_LABELS } from "@/modules/hrm/hrm-legacy-labels";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type SlipFilter = "all" | "pending" | "paid";

function periodRange(year: number, month: number) {
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);
  return {
    label: format(start, "MMMM yyyy"),
    range: `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`,
  };
}

export default function HrmPayrollPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [runId, setRunId] = useState<number | undefined>();
  const [slipFilter, setSlipFilter] = useState<SlipFilter>("all");
  const [search, setSearch] = useState("");
  const [structuresOpen, setStructuresOpen] = useState(false);
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
  } = useHrmPayrollChecklistByPeriod(year, month);
  const { data: structures } = useHrmSalaryStructures();
  const { data: employeesData } = useHrmEmployees({ status: "active", limit: 500 });
  const generate = useGeneratePayrollRun();
  const finalize = useFinalizePayrollRun();
  const markPaid = useMarkPayrollRunPaid();
  const review = useReviewPayrollRun();
  const updateLine = useUpdatePayrollLine();
  const upsertStructure = useUpsertSalaryStructure();

  const selectedRun = (runs?.runs ?? []).find((r) => r.id === runId);
  const isDraft = selectedRun?.status === "draft";
  const isReviewed = selectedRun?.status === "reviewed";
  const isFinalized = selectedRun?.status === "finalized";
  const runStatus = selectedRun?.status;
  const isCurrentPeriod = year === now.getFullYear() && month === now.getMonth() + 1;
  const { label: periodLabel, range: dateRangeLabel } = periodRange(year, month);
  const payrollBlocked = checklist ? !checklist.ready : false;
  const canRunPayroll =
    !checklistLoading &&
    !payrollBlocked &&
    (!selectedRun || isDraft) &&
    !generate.isPending;
  const runPayrollDisabledReason = checklistLoading
    ? "Checking payroll readiness…"
    : payrollBlocked
      ? "Resolve payroll blockers listed below"
      : selectedRun && !isDraft
        ? `Payroll for this period is ${selectedRun.status}`
        : undefined;

  useEffect(() => {
    const match = (runs?.runs ?? []).find((r) => r.year === year && r.month === month);
    setRunId(match?.id);
  }, [runs, year, month]);

  const lineRows = lines?.lines ?? [];
  const structureRows = structures?.structures ?? [];
  const employeeOptions = employeesData?.employees ?? [];

  const missingStructureBlocker = checklist?.blockers.find((b) => b.code === "missing_salary_structure");

  useEffect(() => {
    if (!structuresOpen || structEmployeeKey) return;
    const firstMissing = missingStructureBlocker?.items?.[0];
    if (firstMissing?.userId != null) {
      setStructEmployeeKey(String(firstMissing.userId));
    }
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

  const handleSaveStructure = () => {
    const userId = Number(structEmployeeKey);
    const basic = Number(structBasic);
    if (!Number.isFinite(userId) || userId < 1 || !Number.isFinite(basic) || basic <= 0) {
      toast.error("Select an employee and enter a valid basic salary");
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
          void refetchChecklist();
        },
      },
    );
  };

  const totals = useMemo(() => {
    const contractPay = lineRows.reduce((s, l) => s + (l.gross ?? 0), 0);
    const totalNet = lineRows.reduce((s, l) => s + (l.net ?? 0), 0);
    const totalDeductions = lineRows.reduce((s, l) => s + (l.deductions ?? 0), 0);
    const paid = runStatus === "paid";
    const paidAmount = paid ? totalNet : 0;
    const pendingAmount = paid ? 0 : totalNet;
    const paidCount = paid ? lineRows.length : 0;
    const pendingCount = paid ? 0 : lineRows.length;
    const progressPct = totalNet > 0 ? (paidAmount / totalNet) * 100 : 0;
    return {
      contractPay,
      totalNet,
      totalDeductions,
      paidAmount,
      pendingAmount,
      paidCount,
      pendingCount,
      progressPct,
      employeeCount: lineRows.length,
    };
  }, [lineRows, runStatus]);

  const payrollKpis = useMemo(
    () => totals,
    [totals],
  );

  const filteredLines = useMemo(() => {
    let rows = lineRows;
    if (slipFilter === "paid") rows = rows.filter(() => isLinePaid(runStatus));
    if (slipFilter === "pending") rows = rows.filter(() => isLinePending(runStatus));
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (l) =>
          (l.employeeName ?? "").toLowerCase().includes(q) ||
          (l.employeeId ?? "").toLowerCase().includes(q),
      );
    }
    return [...rows].sort((a, b) => (a.employeeName ?? "").localeCompare(b.employeeName ?? ""));
  }, [lineRows, slipFilter, search, runStatus]);

  const { pagination, setPage } = useClientPagination(filteredLines, DEFAULT_TABLE_PAGE_SIZE);

  const payrollLineColumns = useMemo((): Column<HrmPayrollLine>[] => {
    const cols: Column<HrmPayrollLine>[] = [
      {
        id: "employee",
        header: "Employee",
        cell: (line) => (
          <>
            <div className="font-medium">{line.employeeName ?? `User #${line.userId}`}</div>
            {line.employeeId && <div className="text-xs text-muted-foreground">{line.employeeId}</div>}
          </>
        ),
        exportValue: (line) => line.employeeName ?? String(line.userId),
      },
      {
        id: "gross",
        header: "Contract net",
        className: "text-right",
        cell: (line) => <span className="tabular-nums">{formatPayrollAmount(line.gross)}</span>,
        exportValue: (line) => formatPayrollAmount(line.gross),
      },
      {
        id: "net",
        header: "Net pay",
        className: "text-right",
        cell: (line) => (
          <span className="tabular-nums font-semibold text-violet-600 dark:text-violet-400">
            {formatPayrollAmount(line.net)}
          </span>
        ),
        exportValue: (line) => formatPayrollAmount(line.net),
      },
      {
        id: "attendance",
        header: "Attendance",
        cell: (line) => (
          <span className="text-sm text-muted-foreground">
            {line.paidDays} paid · {line.lopDays} LOP · {line.lateCount} late
          </span>
        ),
        exportValue: (line) => `${line.paidDays} paid · ${line.lopDays} LOP · ${line.lateCount} late`,
      },
      {
        id: "status",
        header: "Status",
        cell: (line) => {
          const status = payrollLineStatus(runStatus);
          return (
            <Badge variant="outline" className={cn("text-[10px]", status.className)}>
              {status.label}
            </Badge>
          );
        },
        exportValue: () => payrollLineStatus(runStatus).label,
      },
    ];
    if (isDraft) {
      cols.push({
        id: "lop",
        header: "LOP",
        className: "w-24",
        cell: (line) => (
          <Input
            type="number"
            className="w-16 h-8"
            defaultValue={line.lopDays}
            onBlur={(e) => {
              const lopDays = Number(e.target.value);
              if (Number.isNaN(lopDays) || lopDays === line.lopDays) return;
              updateLine.mutate(
                { lineId: line.id, lopDays },
                {
                  onSuccess: () => {
                    toast.success("LOP updated");
                    void refetchLines();
                  },
                },
              );
            }}
          />
        ),
        exportValue: (line) => String(line.lopDays),
      });
    }
    return cols;
  }, [isDraft, runStatus, updateLine, refetchLines]);

  const structureColumns = useMemo((): Column<HrmSalaryStructure>[] => [
    {
      id: "employee",
      header: "Employee",
      cell: (s) => (
        <span className="font-medium">
          {s.employeeName ?? `User #${s.userId}`}
          {s.employeeId ? (
            <span className="ml-1 text-xs text-muted-foreground">({s.employeeId})</span>
          ) : null}
        </span>
      ),
      exportValue: (s) => s.employeeName ?? String(s.userId),
    },
    {
      id: "gross",
      header: "Gross",
      className: "text-right",
      cell: (s) => <span className="tabular-nums">{formatPayrollAmount(s.gross)}</span>,
      exportValue: (s) => formatPayrollAmount(s.gross),
    },
    {
      id: "net",
      header: "Net",
      className: "text-right",
      cell: (s) => <span className="tabular-nums font-medium">{formatPayrollAmount(s.net)}</span>,
      exportValue: (s) => formatPayrollAmount(s.net),
    },
  ], []);

  useEffect(() => {
    setPage(1);
  }, [slipFilter, search, year, month, setPage]);

  const shiftPeriod = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  };

  const handleRefresh = () => {
    void refetchRuns();
    void refetchLines();
    void refetchChecklist();
  };

  const extractChecklistFromError = (error: unknown): HrmPayrollChecklist | undefined => {
    if (!isApiError(error)) return undefined;
    const data = error.data as {
      checklist?: HrmPayrollChecklist;
      details?: { checklist?: HrmPayrollChecklist };
    } | null;
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
    a.download = `payroll-${month}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBankExport = async () => {
    if (!runId) {
      toast.error("Generate payroll for this period first");
      return;
    }
    if (!selectedRun || !["finalized", "paid"].includes(selectedRun.status)) {
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
    a.download = `payroll-bank-${month}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunPayroll = () => {
    if (!canRunPayroll) {
      if (payrollBlocked) {
        toast.error("Resolve the payroll blockers below before running payroll");
      } else if (runPayrollDisabledReason) {
        toast.error(runPayrollDisabledReason);
      }
      return;
    }
    generate.mutate(
      { year, month },
      {
        onSuccess: (r) => {
          setRunId(r.id);
          toast.success("Payroll run generated");
          void refetchChecklist();
        },
        onError: (error) => {
          const blockerChecklist = extractChecklistFromError(error);
          if (blockerChecklist && !blockerChecklist.ready) {
            toast.error("Payroll cannot be run until all blockers are resolved");
            void refetchChecklist();
            return;
          }
          toast.error("Could not generate payroll");
        },
      },
    );
  };

  const isRefreshing = runsFetching || linesFetching || checklistFetching;

  return (
    <HrmGate module="payroll">
      <HrmPageShell className="space-y-3">
        <PayPeriodHeader
          year={year}
          month={month}
          periodLabel={periodLabel}
          dateRangeLabel={dateRangeLabel}
          run={selectedRun}
          isCurrentPeriod={isCurrentPeriod}
          onPrev={() => shiftPeriod(-1)}
          onNext={() => shiftPeriod(1)}
          monthSelect={
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className={cn(payrollSelectTriggerClass, "w-[7.5rem]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, i) => (
                  <SelectItem key={name} value={String(i + 1)}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          yearSelect={
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className={cn(payrollSelectTriggerClass, "w-20")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <PayrollMetricCard
            label="Contract pay"
            value={formatPayrollAmount(payrollKpis.contractPay)}
            hint="Sum of contract net salaries"
            icon={FileText}
          />
          <PayrollMetricCard
            label="Total net payroll"
            value={formatPayrollAmount(payrollKpis.totalNet)}
            hint={`${formatPayrollAmount(payrollKpis.totalDeductions)} deductions applied`}
            tone="violet"
            icon={IndianRupee}
          />
          <PayrollMetricCard
            label="Paid amount"
            value={formatPayrollAmount(payrollKpis.paidAmount)}
            hint={`${payrollKpis.paidCount} payslips`}
            tone="green"
            icon={CheckCircle2}
          />
          <PayrollMetricCard
            label="Pending amount"
            value={formatPayrollAmount(payrollKpis.pendingAmount)}
            hint={`${payrollKpis.pendingCount} payslips`}
            tone="amber"
            icon={Clock}
          />
          <PayrollMetricCard
            label="Employees"
            value={String(payrollKpis.employeeCount)}
            hint="In this pay period"
            icon={Users}
          />
        </div>

        <PayrollDisbursementProgress progressPct={payrollKpis.progressPct} />

        <PayrollReadinessBanner
          checklist={checklist}
          loading={checklistLoading || (checklistFetching && !checklist)}
          onOpenPayrollSettings={() => setStructuresOpen(true)}
        />

        <div className={payrollPanelClass}>
          <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Employee payslips</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {periodLabel} · review, disburse, and download
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                className={cn(payrollRunButtonClass, !canRunPayroll && "pointer-events-none opacity-45")}
                disabled={!canRunPayroll}
                title={runPayrollDisabledReason}
                onClick={handleRunPayroll}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Run payroll
              </Button>
              <Button
                variant="outline"
                className={payrollOutlineButtonClass}
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className={payrollIconButtonClass}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isDraft && runId && (
                    <DropdownMenuItem onClick={() => review.mutate(runId, {
                      onSuccess: () => toast.success("Marked reviewed"),
                    })}>
                      Mark reviewed
                    </DropdownMenuItem>
                  )}
                  {(isDraft || isReviewed) && runId && (
                    <DropdownMenuItem
                      onClick={() =>
                        finalize.mutate(runId, {
                          onSuccess: () => toast.success("Payroll finalized — payslips published"),
                        })
                      }
                    >
                      Finalize & publish payslips
                    </DropdownMenuItem>
                  )}
                  {isFinalized && runId && (
                    <DropdownMenuItem
                      onClick={() =>
                        markPaid.mutate(runId, {
                          onSuccess: () => toast.success("Payroll marked as paid"),
                        })
                      }
                    >
                      Mark as paid
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  {runId && selectedRun && ["finalized", "paid"].includes(selectedRun.status) && (
                    <DropdownMenuItem onClick={handleBankExport}>
                      <Download className="h-4 w-4 mr-2" />
                      Export bank transfer CSV
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStructuresOpen(true)}>
                    <Layers className="h-4 w-4 mr-2" />
                    Salary structures
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-4 px-4 pb-5 pt-4 sm:px-5">
            <Tabs value={slipFilter} onValueChange={(v) => setSlipFilter(v as SlipFilter)}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <TabsList className={payrollTabsListClass}>
                  <TabsTrigger value="all" className={payrollTabsTriggerClass}>
                    All ({lineRows.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className={payrollTabsTriggerClass}>
                    Pending ({isLinePending(runStatus) ? lineRows.length : 0})
                  </TabsTrigger>
                  <TabsTrigger value="paid" className={payrollTabsTriggerClass}>
                    Paid ({isLinePaid(runStatus) ? lineRows.length : 0})
                  </TabsTrigger>
                </TabsList>

                <div className="relative w-full lg:max-w-[17rem]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employee name or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(payrollSelectTriggerClass, "h-9 pl-9")}
                  />
                </div>
              </div>

              <TabsContent value={slipFilter} className="mt-4 space-y-4 focus-visible:outline-none">
                {!runId ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-12 text-center">
                    <p className="text-sm font-medium">No payroll run for this period</p>
                    <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                      {payrollBlocked
                        ? "Resolve the blockers above, then run payroll to generate payslips."
                        : "Use Run payroll to generate payslips from attendance and salary structures."}
                    </p>
                  </div>
                ) : (
                  <PortalTablePanel>
                    <AdvancedTable
                      data={filteredLines}
                      columns={payrollLineColumns}
                      filename="HrmPayrollLinesExport"
                      viewStorageKey="hrm-payroll-lines"
                      clientPagination={pagination}
                      showViewToggle={false}
                    />
                  </PortalTablePanel>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Dialog open={structuresOpen} onOpenChange={setStructuresOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{LEGACY_PAYROLL_LABELS.structuresTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {missingStructureBlocker && missingStructureBlocker.count > 0 && (
                <p className="text-sm text-muted-foreground">
                  {missingStructureBlocker.count} active employee(s) still need a salary structure for this pay period.
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
                  { label: LEGACY_PAYROLL_LABELS.basic, value: structBasic, set: setStructBasic, placeholder: "e.g. 190000", hint: "" },
                  { label: LEGACY_PAYROLL_LABELS.hra, value: structHra, set: setStructHra, placeholder: "0", hint: "" },
                  { label: LEGACY_PAYROLL_LABELS.allowances, value: structAllowances, set: setStructAllowances, placeholder: "0", hint: "" },
                  { label: LEGACY_PAYROLL_LABELS.pfEmployee, value: structPfEmployee, set: setStructPfEmployee, placeholder: "0", hint: "" },
                  { label: LEGACY_PAYROLL_LABELS.tds, value: structTds, set: setStructTds, placeholder: "0", hint: "" },
                  {
                    label: LEGACY_PAYROLL_LABELS.bankName,
                    value: structBankName,
                    set: setStructBankName,
                    placeholder: structBankHints.bankName ? `On file: ${structBankHints.bankName}` : "Bank name",
                    hint: structBankHints.bankName ? "Leave blank to keep existing" : "",
                  },
                  {
                    label: LEGACY_PAYROLL_LABELS.accountNumber,
                    value: structAccountNumber,
                    set: setStructAccountNumber,
                    placeholder: structBankHints.accountNumber ? `On file: ${structBankHints.accountNumber}` : "Account number",
                    hint: structBankHints.accountNumber ? "Leave blank to keep existing" : "",
                  },
                  {
                    label: LEGACY_PAYROLL_LABELS.ifsc,
                    value: structIfsc,
                    set: setStructIfsc,
                    placeholder: structBankHints.ifsc ? `On file: ${structBankHints.ifsc}` : "IFSC code",
                    hint: structBankHints.ifsc ? "Leave blank to keep existing" : "",
                  },
                  {
                    label: LEGACY_PAYROLL_LABELS.pan,
                    value: structPan,
                    set: setStructPan,
                    placeholder: structBankHints.pan ? `On file: ${structBankHints.pan}` : "PAN number",
                    hint: structBankHints.pan ? "Leave blank to keep existing" : "",
                  },
                ].map((field) => (
                  <div key={field.label} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                    <Input
                      placeholder={field.placeholder}
                      type={field.label === LEGACY_PAYROLL_LABELS.basic ? "number" : "text"}
                      min={field.label === LEGACY_PAYROLL_LABELS.basic ? 1 : undefined}
                      value={field.value}
                      onChange={(e) => field.set(e.target.value)}
                    />
                    {field.hint ? <p className="text-[10px] text-muted-foreground">{field.hint}</p> : null}
                  </div>
                ))}
                <div className="flex items-end sm:col-span-2">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={upsertStructure.isPending}
                    onClick={handleSaveStructure}
                  >
                    {LEGACY_PAYROLL_LABELS.saveStructure}
                  </Button>
                </div>
              </div>
              <AdvancedTable
                data={structureRows}
                columns={structureColumns}
                searchKey="employeeName"
                searchPlaceholder="Filter employees…"
                filename="HrmSalaryStructuresExport"
                viewStorageKey="hrm-salary-structures"
                showViewToggle={false}
              />
            </div>
          </DialogContent>
        </Dialog>
      </HrmPageShell>
    </HrmGate>
  );
}
