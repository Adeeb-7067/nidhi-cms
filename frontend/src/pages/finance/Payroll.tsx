import { Link } from "wouter";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Users, FileDown, Play, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mockSalaryStructures,
  mockPayrollRuns,
  mockPayrollSlips,
  getPayrollSlipByEmployee,
} from "@/modules/finance/mock-data";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinancePageLoader,
  SalarySlipPreview,
} from "@/modules/finance/components";
import { useMockPageState } from "@/modules/finance/hooks/use-mock-page-state";
import { toast } from "sonner";

export default function PayrollPage() {
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(mockSalaryStructures[0]?.employeeId ?? null);
  const { loading } = useMockPageState();

  const filteredStructures = useMemo(() => {
    const q = search.toLowerCase();
    return mockSalaryStructures.filter(
      (s) => !q || s.employeeName.toLowerCase().includes(q) || s.department.toLowerCase().includes(q),
    );
  }, [search]);

  const latestRun = mockPayrollRuns[0];
  const totalSalaryCost = mockSalaryStructures.reduce((s, x) => s + x.gross, 0);
  const totalBenefits = mockSalaryStructures.reduce((s, x) => s + x.pf, 0);
  const totalEmployerCost = totalSalaryCost + totalBenefits + (latestRun?.bonusTotal ?? 0);

  const slip = selectedEmployee ? getPayrollSlipByEmployee(selectedEmployee) : undefined;

  if (loading) {
    return (
      <PortalPageShell>
        <FinancePageLoader label="Loading payroll…" />
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Payroll (demo)"
        description="Mock data for Finance demos. Live payroll is managed in HRM."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Payroll" }]}
        actions={
          <Button asChild size="sm" className="h-8 gap-1.5">
            <Link href="/hrm/payroll">Open HRM payroll</Link>
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Salary cost / month", value: formatCurrency(totalSalaryCost), icon: Users, accent: "blue", delay: 0 },
          { title: "Benefits (PF etc.)", value: formatCurrency(totalBenefits), icon: Users, accent: "violet", delay: 1 },
          { title: "Total employer cost", value: formatCurrency(totalEmployerCost), icon: IndianRupee, accent: "green", delay: 2 },
        ]}
      />

      <Tabs defaultValue="structure">
        <TabsList className="h-9">
          <TabsTrigger value="structure" className="text-xs">Salary structure</TabsTrigger>
          <TabsTrigger value="processing" className="text-xs">Processing</TabsTrigger>
          <TabsTrigger value="slips" className="text-xs">Salary slips</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-4 space-y-4">
          <FinanceFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search employee or department…" />
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Department</TableHead>
                  <TableHead className="text-xs text-right">Basic</TableHead>
                  <TableHead className="text-xs text-right">HRA</TableHead>
                  <TableHead className="text-xs text-right">Gross</TableHead>
                  <TableHead className="text-xs text-right">Net</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStructures.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs font-medium">{s.employeeName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.department}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(s.basic)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{formatCurrency(s.hra)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums font-medium">{formatCurrency(s.gross)}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums text-emerald-700">{formatCurrency(s.net)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toast.success(`Edit structure for ${s.employeeName} (demo)`)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="processing" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mockPayrollRuns.map((run) => (
              <Card key={run.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{run.month} {run.year}</CardTitle>
                    <FinanceStatusBadge variant="payroll" value={run.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Employees</span><span>{run.employeeCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Gross</span><span className="tabular-nums">{formatCurrency(run.totalGross)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Deductions</span><span className="tabular-nums">{formatCurrency(run.totalDeductions)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Bonus</span><span className="tabular-nums text-emerald-700">{formatCurrency(run.bonusTotal)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-2"><span>Net payout</span><span className="tabular-nums">{formatCurrency(run.totalNet + run.bonusTotal)}</span></div>
                  {run.processedAt && (
                    <p className="text-[10px] text-muted-foreground">Processed {format(new Date(run.processedAt), "MMM d, yyyy")}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="slips" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Select employee</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {mockPayrollSlips.map((s) => (
                  <Button
                    key={s.id}
                    variant={selectedEmployee === s.employeeId ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-9 text-xs"
                    onClick={() => setSelectedEmployee(s.employeeId)}
                  >
                    {s.employeeName} — {s.month} {s.year}
                  </Button>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-3">
              {slip && (
                <>
                  <SalarySlipPreview
                    employeeName={slip.employeeName}
                    month={slip.month}
                    year={slip.year}
                    basic={slip.basic}
                    hra={slip.hra}
                    specialAllowance={slip.specialAllowance}
                    bonus={slip.bonus}
                    pf={slip.pf}
                    professionalTax={slip.professionalTax}
                    tds={slip.tds}
                    gross={slip.gross}
                    net={slip.net}
                  />
                  <Button className="w-full h-8 gap-1.5" onClick={() => toast.success("Salary slip PDF download started (demo)")}>
                    <FileDown className="h-3.5 w-3.5" />
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PortalPageShell>
  );
}
