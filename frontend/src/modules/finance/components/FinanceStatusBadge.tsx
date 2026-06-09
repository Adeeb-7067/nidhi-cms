import { cn } from "@/lib/utils";
import type { ExpenseCategory, ExpenseStatus, FinanceInvoiceStatus, IncomeStatus, BudgetStatus, PayrollStatus } from "../types";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  FINANCE_INVOICE_STATUS_LABELS,
  INCOME_STATUS_LABELS,
  BUDGET_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
} from "../constants";

type BadgeVariant =
  | "expense"
  | "expenseCategory"
  | "income"
  | "invoice"
  | "budget"
  | "payroll"
  | "payment";

const expenseStyles: Record<ExpenseStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  approved: "bg-green-500/10 text-green-700 border-green-500/25",
  rejected: "bg-red-500/10 text-red-600 border-red-500/25",
};

const incomeStyles: Record<IncomeStatus, string> = {
  received: "bg-green-500/10 text-green-700 border-green-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  partial: "bg-violet-500/10 text-violet-700 border-violet-500/25",
};

const invoiceStyles: Record<FinanceInvoiceStatus, string> = {
  paid: "bg-green-500/10 text-green-700 border-green-500/25",
  unpaid: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  partially_paid: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  overdue: "bg-red-500/10 text-red-600 border-red-500/25",
};

const budgetStyles: Record<BudgetStatus, string> = {
  on_track: "bg-green-500/10 text-green-700 border-green-500/25",
  warning: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  exceeded: "bg-red-500/10 text-red-600 border-red-500/25",
};

const payrollStyles: Record<PayrollStatus, string> = {
  draft: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  processed: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  paid: "bg-green-500/10 text-green-700 border-green-500/25",
};

const paymentStyles: Record<string, string> = {
  completed: "bg-green-500/10 text-green-700 border-green-500/25",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  failed: "bg-red-500/10 text-red-600 border-red-500/25",
};

export function FinanceStatusBadge({
  variant,
  value,
  className,
}: {
  variant: BadgeVariant;
  value: string;
  className?: string;
}) {
  let label = value;
  let style = "bg-secondary text-secondary-foreground";

  if (variant === "expense") {
    const v = value as ExpenseStatus;
    label = EXPENSE_STATUS_LABELS[v] ?? value;
    style = expenseStyles[v] ?? style;
  } else if (variant === "expenseCategory") {
    label = EXPENSE_CATEGORY_LABELS[value as ExpenseCategory] ?? value;
    style = "bg-slate-500/10 text-slate-700 border-slate-500/25";
  } else if (variant === "income") {
    const v = value as IncomeStatus;
    label = INCOME_STATUS_LABELS[v] ?? value;
    style = incomeStyles[v] ?? style;
  } else if (variant === "invoice") {
    const v = value as FinanceInvoiceStatus;
    label = FINANCE_INVOICE_STATUS_LABELS[v] ?? value;
    style = invoiceStyles[v] ?? style;
  } else if (variant === "budget") {
    const v = value as BudgetStatus;
    label = BUDGET_STATUS_LABELS[v] ?? value;
    style = budgetStyles[v] ?? style;
  } else if (variant === "payroll") {
    const v = value as PayrollStatus;
    label = PAYROLL_STATUS_LABELS[v] ?? value;
    style = payrollStyles[v] ?? style;
  } else if (variant === "payment") {
    style = paymentStyles[value] ?? style;
    label = value.charAt(0).toUpperCase() + value.slice(1);
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap",
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}
