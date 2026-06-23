import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HrmGate } from "@/modules/hrm/HrmGate";
import { HrmPageShell } from "@/modules/hrm/components";
import { HrmRefStatStrip } from "@/modules/hrm/hrm-reference-kit";
import {
  HrmPayrollExplorer,
  payrollStatusPill,
} from "@/modules/hrm/payroll-satyakabir-ui";
import { HrmPayslipPreviewPanel } from "@/modules/hrm/HrmPayslipPreviewPanel";
import { HrmPayslipDownloadButton } from "@/modules/hrm/HrmPayslipDownloadButton";
import { inrMoney } from "@/modules/hrm/payslip-view-model";
import { payslipPeriodLabel } from "@/modules/hrm/payslip-utils";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPayslips } from "@/api/hrm";
import type { HrmPayslip } from "@/modules/hrm/types";
import { cn } from "@/lib/utils";

export default function HrmMyPayslipsPage() {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading, isFetching, refetch } = useMyPayslips(year);
  const slips = data?.slips ?? [];

  const yearOptions = useMemo(() => {
    const years = new Set(slips.map((s) => s.year));
    years.add(currentYear);
    years.add(currentYear - 1);
    return [...years].sort((a, b) => b - a);
  }, [slips, currentYear]);

  const total = slips.reduce((s, r) => s + (r.net ?? 0), 0);
  const latest = slips[0] ? payslipPeriodLabel(slips[0].month, slips[0].year) : "—";

  const stats = [
    { label: "Slips", value: String(slips.length) },
    { label: "Total paid", value: inrMoney(total), valueClassName: "text-primary" },
    { label: "Latest", value: latest },
  ];

  const slipStatus = (s: HrmPayslip) => (s.status === "PAID" ? "PAID" : "UNPAID");

  return (
    <HrmGate module="my_payslips">
      <HrmPageShell className="space-y-4">
        <HrmPayrollExplorer<HrmPayslip>
          title="My salary slips"
          subtitle={`${user?.name ?? "Employee"} · ${year}`}
          data={slips}
          getId={(r) => String(r.id)}
          actions={
            <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => void refetch()}>
              <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
          }
          filterBar={
            <div className="space-y-4">
              <HrmRefStatStrip stats={stats} loading={isLoading} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          }
          columns={[
            {
              key: "month",
              header: "Month",
              render: (r) => (
                <span className="text-xs font-semibold tabular-nums">
                  {payslipPeriodLabel(r.month, r.year)}
                </span>
              ),
            },
            {
              key: "gross",
              header: "Gross",
              className: "text-right",
              render: (r) => (
                <span className="text-xs tabular-nums">
                  {r.gross != null ? inrMoney(r.gross) : "—"}
                </span>
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
              render: (r) => payrollStatusPill(slipStatus(r) === "PAID"),
            },
            {
              key: "dl",
              header: "",
              className: "text-right w-16",
              render: (r) => <HrmPayslipDownloadButton payslipId={r.id} />,
            },
          ]}
          detailTitle={(r) => `Salary slip · ${payslipPeriodLabel(r.month, r.year)}`}
          detailSubtitle={() => user?.name ?? ""}
          detailSheetClassName="sm:max-w-3xl"
          renderDetail={(r) => <HrmPayslipPreviewPanel payslipId={r.id} />}
          emptyHint="No salary slips found for this year yet."
        />
      </HrmPageShell>
    </HrmGate>
  );
}
