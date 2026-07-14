import { useState } from "react";
import { ChevronLeft, ChevronRight, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/modules/finance/constants";
import { useDepartmentPayroll } from "@/api/finance";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs text-right">Employees</TableHead>
                  <TableHead className="text-xs text-right">Net paid</TableHead>
                  <TableHead className="text-xs text-right">Cost to company</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d) => (
                  <TableRow key={d.department} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-medium">{d.department}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Users className="h-3 w-3" />{d.employees}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(d.net)}</TableCell>
                    <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(d.cost)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 bg-muted/20 font-semibold">
                  <TableCell className="text-xs">Total</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{totals.employees}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(totals.net)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{formatCurrency(totals.cost)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
