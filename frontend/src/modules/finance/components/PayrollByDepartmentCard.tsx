import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { formatCurrency } from "@/modules/finance/constants";
import { useDepartmentPayroll } from "@/api/finance";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type PayrollDeptRow = {
  department: string;
  employees: number;
  net: number;
  cost: number;
  isTotal?: boolean;
};

const payrollColumns: CmsColumn<PayrollDeptRow>[] = [
  {
    id: "department",
    header: "Department",
    cell: (d) => <span className="font-medium">{d.department}</span>,
  },
  {
    id: "employees",
    header: "Employees",
    align: "right",
    cell: (d) =>
      d.isTotal ? (
        <span className="tabular-nums">{d.employees}</span>
      ) : (
        <span className="inline-flex items-center gap-1 justify-end tabular-nums text-muted-foreground">
          <Users className="h-3 w-3" />
          {d.employees}
        </span>
      ),
  },
  {
    id: "net",
    header: "Net paid",
    align: "right",
    cell: (d) => <span className="tabular-nums">{formatCurrency(d.net)}</span>,
  },
  {
    id: "cost",
    header: "Cost to company",
    align: "right",
    cell: (d) => (
      <span className={d.isTotal ? "tabular-nums" : "font-medium tabular-nums"}>
        {formatCurrency(d.cost)}
      </span>
    ),
  },
];

const RUN_STATUS_HINT: Record<string, string> = {
  draft: "This month's payroll is still a draft — nothing paid yet.",
  reviewed: "This month's payroll is under review — nothing paid yet.",
  finalized: "This month's payroll is finalized but not marked paid yet.",
};

export function PayrollByDepartmentCard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, isError } = useDepartmentPayroll(year, month);

  const goPrev = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const departments = data?.departments ?? [];
  const totals = data?.totals ?? { employees: 0, net: 0, cost: 0 };
  const hasPaid = departments.length > 0;
  const statusHint = data?.runStatus ? RUN_STATUS_HINT[data.runStatus] : null;

  const payrollRows = useMemo<PayrollDeptRow[]>(
    () => [
      ...departments.map((d) => ({ ...d, isTotal: false as const })),
      { department: "Total", employees: totals.employees, net: totals.net, cost: totals.cost, isTotal: true },
    ],
    [departments, totals],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Payroll by department
          </CardTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">Paid salaries (cost to company incl. employer PF)</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={goPrev} aria-label="Previous month">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium tabular-nums min-w-[110px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={goNext} aria-label="Next month">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Loading payroll…</p>
        ) : isError ? (
          <p className="text-xs text-destructive py-6 text-center">Failed to load payroll data.</p>
        ) : !hasPaid ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            {statusHint ?? `No paid payroll for ${MONTH_NAMES[month]} ${year}.`}
          </p>
        ) : (
          <CmsDataTable
            embedded
            columns={payrollColumns}
            rows={payrollRows}
            rowKey={(d) => (d.isTotal ? "__total" : d.department)}
            getRowClassName={(d) =>
              d.isTotal ? "border-t-2 bg-muted/20 font-semibold hover:bg-muted/20" : undefined
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
