import { format } from "date-fns";
import { Link } from "wouter";
import { ArrowRight, AlertCircle, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Budget, FinanceInvoice, FinanceTransaction } from "../types";
import { calcBudgetConsumption, calcInvoiceTotal, formatCurrency, COMPANY_FINANCE } from "../constants";
import { FinanceStatusBadge } from "./FinanceStatusBadge";

export function FinanceSummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  accent = "blue",
  alert,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "blue" | "green" | "amber" | "red" | "violet";
  alert?: boolean;
}) {
  const accents = {
    blue: "text-blue-600 bg-blue-500/10",
    green: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    red: "text-red-600 bg-red-500/10",
    violet: "text-violet-600 bg-violet-500/10",
  };
  return (
    <Card className={cn(alert && "border-red-500/30")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
            {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("rounded-lg p-2 shrink-0", accents[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BudgetConsumptionCard({ budget }: { budget: Budget }) {
  const pct = calcBudgetConsumption(budget.spent, budget.allocated);
  return (
    <Card className={cn(budget.status === "exceeded" && "border-red-500/30")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{budget.name}</p>
            <p className="text-[10px] text-muted-foreground">{budget.type === "project" ? "Project budget" : budget.department}</p>
          </div>
          <FinanceStatusBadge variant="budget" value={budget.status} />
        </div>
        <Progress value={pct} className={cn("h-2", budget.status === "exceeded" && "[&>div]:bg-red-500")} />
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{formatCurrency(budget.spent)} spent</span>
          <span>{pct}% of {formatCurrency(budget.allocated)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentTransactionsList({ transactions, limit }: { transactions: FinanceTransaction[]; limit?: number }) {
  const rows = limit ? transactions.slice(0, limit) : transactions;
  return (
    <div className="space-y-0">
      {rows.map((tx, i) => (
        <div key={tx.id} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                tx.type === "income" ? "bg-emerald-500/10 text-emerald-600" : tx.type === "expense" ? "bg-red-500/10 text-red-600" : "bg-blue-500/10 text-blue-600",
              )}
            >
              {tx.type === "income" ? <TrendingUp className="h-3.5 w-3.5" /> : tx.type === "expense" ? <TrendingDown className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </div>
            {i < rows.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[1rem]" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-xs font-semibold truncate">{tx.description}</p>
            <p className="text-[10px] text-muted-foreground">{tx.party} · {format(new Date(tx.date), "MMM d, yyyy")}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs font-medium tabular-nums", tx.type === "expense" ? "text-red-700" : "text-emerald-700")}>
                {tx.type === "expense" ? "−" : "+"}{formatCurrency(tx.amount)}
              </span>
              {tx.href && (
                <Link href={tx.href} className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline">
                  View <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinanceInvoicePreview({ invoice }: { invoice: FinanceInvoice }) {
  const { total } = calcInvoiceTotal(invoice.items, invoice.discount, invoice.gstEnabled);
  const remaining = Math.max(0, total - invoice.paidAmount);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold">{invoice.number}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{invoice.clientName}</p>
          </div>
          <FinanceStatusBadge variant="invoice" value={invoice.status} />
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="text-[10px] text-muted-foreground">
          <p className="font-semibold text-foreground">{COMPANY_FINANCE.name}</p>
          <p>GSTIN: {COMPANY_FINANCE.gstin}</p>
        </div>
        {invoice.projectName && (
          <div className="text-xs">
            <span className="text-muted-foreground">Project:</span>{" "}
            <span className="font-medium">{invoice.projectName}</span>
          </div>
        )}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-2 font-medium">Item</th>
                <th className="text-right p-2 font-medium">Qty</th>
                <th className="text-right p-2 font-medium">Rate</th>
                <th className="text-right p-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.description}</td>
                  <td className="p-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="p-2 text-right tabular-nums">{formatCurrency(item.rate)}</td>
                  <td className="p-2 text-right tabular-nums font-medium">{formatCurrency(item.quantity * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-bold text-base tabular-nums">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid</p>
            <p className="font-bold text-base tabular-nums text-emerald-700">{formatCurrency(invoice.paidAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className={cn("font-bold text-base tabular-nums", remaining > 0 && "text-amber-700")}>{formatCurrency(remaining)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due date</p>
            <p className="font-medium">{format(new Date(invoice.dueDate), "MMM d, yyyy")}</p>
          </div>
        </div>
        {invoice.gstEnabled && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> GST @ 18% included in line items
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function SalarySlipPreview({
  employeeName,
  month,
  year,
  basic,
  hra,
  specialAllowance,
  bonus,
  pf,
  professionalTax,
  tds,
  gross,
  net,
}: {
  employeeName: string;
  month: string;
  year: number;
  basic: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  pf: number;
  professionalTax: number;
  tds: number;
  gross: number;
  net: number;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-white text-foreground shadow-sm">
      <div className="border-b p-6 text-center">
        <p className="text-lg font-bold tracking-tight">{COMPANY_FINANCE.name}</p>
        <p className="text-[10px] text-muted-foreground mt-1">Salary Slip — {month} {year}</p>
      </div>
      <div className="p-6 space-y-4 text-sm">
        <div className="rounded-lg border p-3 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Employee</span><span className="font-medium">{employeeName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Basic</span><span className="tabular-nums">{formatCurrency(basic)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">HRA</span><span className="tabular-nums">{formatCurrency(hra)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Special Allowance</span><span className="tabular-nums">{formatCurrency(specialAllowance)}</span></div>
          {bonus > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Bonus</span><span className="tabular-nums text-emerald-700">{formatCurrency(bonus)}</span></div>}
          <div className="border-t pt-2 flex justify-between font-medium"><span>Gross</span><span className="tabular-nums">{formatCurrency(gross)}</span></div>
          <div className="flex justify-between text-red-700"><span>PF</span><span className="tabular-nums">−{formatCurrency(pf)}</span></div>
          <div className="flex justify-between text-red-700"><span>Professional Tax</span><span className="tabular-nums">−{formatCurrency(professionalTax)}</span></div>
          {tds > 0 && <div className="flex justify-between text-red-700"><span>TDS</span><span className="tabular-nums">−{formatCurrency(tds)}</span></div>}
          <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Net Pay</span><span className="tabular-nums text-emerald-800">{formatCurrency(net)}</span></div>
        </div>
      </div>
    </div>
  );
}
