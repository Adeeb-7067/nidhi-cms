import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageShell } from "@/modules/hrm/components";
import { HrmPersonChip } from "@/modules/hrm/rich-ui-kit";
import { HrmPayrollExplorer, currentPayrollPeriod } from "@/modules/hrm/payroll-satyakabir-ui";
import { ManualPayslipPreviewPanel } from "@/modules/hrm/ManualPayslipPreviewPanel";
import { HrmPayslipDownloadButton } from "@/modules/hrm/HrmPayslipDownloadButton";
import { inrMoney } from "@/modules/hrm/payslip-view-model";
import { payslipPeriodLabel } from "@/modules/hrm/payslip-utils";
import {
  useManualPayslips,
  useUpsertManualPayslip,
  useDeleteManualPayslip,
  useHrmEmployees,
} from "@/api/hrm";
import { toastApiError } from "@/lib/api-error";
import type { HrmManualPayslipRow } from "@/modules/hrm/types";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function yearOptions() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= current - 5; y -= 1) years.push(y);
  return years;
}

export default function HrmManualPayslipsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<HrmManualPayslipRow | null>(null);

  const nowPeriod = currentPayrollPeriod();
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(String(nowPeriod.month));
  const [year, setYear] = useState(String(nowPeriod.year));
  const [net, setNet] = useState("");

  const { data, isLoading, isFetching, refetch } = useManualPayslips({ allPeriods: true });
  const { data: employeesData } = useHrmEmployees({ limit: 500 });
  const upsert = useUpsertManualPayslip();
  const removeSlip = useDeleteManualPayslip();

  const rows = data?.slips ?? [];
  const employees = employeesData?.employees ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        (r.employeeId ?? "").toLowerCase().includes(q) ||
        payslipPeriodLabel(r.month, r.year).toLowerCase().includes(q),
    );
  }, [rows, search]);

  const resetForm = () => {
    setEmployeeId("");
    setMonth(String(nowPeriod.month));
    setYear(String(nowPeriod.year));
    setNet("");
  };

  const handleSubmit = () => {
    const userId = Number(employeeId);
    const netAmount = Number(net);
    if (!Number.isFinite(userId) || userId <= 0) {
      toast.error("Select an employee");
      return;
    }
    if (!Number.isFinite(netAmount) || netAmount < 0) {
      toast.error("Enter a valid net salary amount");
      return;
    }
    upsert.mutate(
      { userId, year: Number(year), month: Number(month), net: netAmount },
      {
        onSuccess: () => {
          toast.success("Manual payslip saved");
          setDialogOpen(false);
          resetForm();
          void refetch();
        },
        onError: (err) => toastApiError(err, "Could not save manual payslip"),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteRow) return;
    removeSlip.mutate(deleteRow.id, {
      onSuccess: () => {
        toast.success("Manual payslip deleted");
        setDeleteRow(null);
        void refetch();
      },
      onError: (err) => toastApiError(err, "Could not delete manual payslip"),
    });
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
            <h1 className="text-2xl font-bold tracking-tight">Manual payslips</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Issue a one-off payslip by entering an employee's net salary for a month. Re-entering a
              month replaces (corrects) that payslip.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5" asChild>
              <Link href="/hrm/salary-slips">
                <ExternalLink className="size-3.5" />
                Salary slips
              </Link>
            </Button>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" />
              Create manual payslip
            </Button>
          </div>
        </div>

        <HrmPayrollExplorer<HrmManualPayslipRow>
          title="Manual payslips"
          subtitle="Manually issued payslips — click a row for the full slip preview"
          data={filtered}
          getId={(r) => String(r.id)}
          emptyHint="No manual payslips yet — use 'Create manual payslip' to add one."
          actions={
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void refetch()}>
              <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
          }
          filterBar={
            <Input
              placeholder="Search employee or period…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 max-w-xs"
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
              <span className="text-sm font-bold tabular-nums text-primary">{inrMoney(r.net)}</span>
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
                  subtitle={[r.employeeId, r.designation].filter(Boolean).join(" · ") || undefined}
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
                <span className="text-xs font-bold tabular-nums text-primary">{inrMoney(r.net)}</span>
              ),
            },
            {
              key: "actions",
              header: "",
              className: "text-right w-28",
              render: (r) => (
                <div className="flex items-center justify-end gap-2">
                  <HrmPayslipDownloadButton
                    payslipId={r.id}
                    detailUrl={`/api/hrm/manual-payslips/${r.id}`}
                  />
                  <button
                    type="button"
                    data-stop-row-click
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteRow(r);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
          detailTitle={(r) => r.employeeName}
          detailSubtitle={(r) => payslipPeriodLabel(r.month, r.year)}
          detailSheetClassName="w-full overflow-y-auto sm:max-w-4xl"
          renderDetail={(r) => <ManualPayslipPreviewPanel payslipId={r.id} />}
        />

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create manual payslip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Employee</label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                        {e.employeeId ? ` (${e.employeeId})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Month</label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={m} value={String(i + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Year</label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions().map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Net salary (₹)</label>
                <Input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  placeholder="e.g. 45000"
                  value={net}
                  onChange={(e) => setNet(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  If a payslip already exists for this employee and month, it will be replaced.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={upsert.isPending}>
                {upsert.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Save payslip
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete manual payslip?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteRow
                  ? `This removes the manual payslip for ${deleteRow.employeeName} (${payslipPeriodLabel(
                      deleteRow.month,
                      deleteRow.year,
                    )}). This cannot be undone.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={removeSlip.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removeSlip.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </HrmPageShell>
    </HrmGate>
  );
}
