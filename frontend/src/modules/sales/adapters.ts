import type {
  SalesInvoice as ApiInvoice,
  SalesPayment,
  Customer,
  Installment,
} from "@/api/sales";
import type { PartialPayment, PaymentReceipt, SalesInvoice } from "./types";
import { calcRemaining } from "./constants";
import { formatPaymentMethod } from "./utils";

export function toInvoicePreview(
  invoice: ApiInvoice,
  customerName?: string,
  installmentName?: string,
): SalesInvoice {
  return {
    id: invoice.id,
    number: invoice.number,
    customer: customerName ?? `Customer #${invoice.customerId}`,
    customerId: invoice.customerId,
    projectId: invoice.projectId ?? undefined,
    installmentId: invoice.installmentId ?? undefined,
    installmentName,
    amount: invoice.amount,
    paidAmount: invoice.paidAmount,
    status: invoice.status,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt,
  };
}

export function paymentToPartial(p: SalesPayment): PartialPayment {
  return {
    id: p.id,
    installmentId: 0,
    amount: p.amount,
    mode: formatPaymentMethod(p.paymentMethod),
    transactionId: p.transactionId ?? "—",
    paymentDate: p.createdAt,
    status: "received",
    receiptId: p.id,
    receiptNumber: p.receiptNumber,
  };
}

export function toReceiptPreview(
  payment: SalesPayment,
  invoice: ApiInvoice,
  customer: Customer,
): PaymentReceipt {
  const remaining = calcRemaining(invoice.amount, invoice.paidAmount);
  return {
    id: payment.id,
    number: payment.receiptNumber,
    invoiceNumber: invoice.number,
    installmentName: invoice.installmentId ? `Installment #${invoice.installmentId}` : "—",
    customerName: customer.companyName,
    projectName: invoice.projectId ? `Project #${invoice.projectId}` : "—",
    amountPaid: payment.amount,
    remainingBalance: remaining,
    paymentMethod: formatPaymentMethod(payment.paymentMethod),
    transactionId: payment.transactionId ?? "—",
    generatedAt: payment.createdAt,
    companyName: "Content Management Hub",
    companyAddress: "India",
    companyGstin: "—",
  };
}

export function installmentCardData(inst: Installment) {
  return {
    id: inst.id,
    name: inst.name,
    dueAmount: inst.dueAmount,
    paidAmount: inst.paidAmount,
    dueDate: inst.dueDate,
    status: inst.status,
    projectId: inst.projectId,
    invoiceId: inst.invoiceId,
  };
}
