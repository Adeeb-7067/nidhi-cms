import type {
  SalesInvoice as ApiInvoice,
  SalesPayment,
  Customer,
  Installment,
} from "@/api/sales";
import type { PartialPayment, PaymentReceipt, SalesInvoice } from "./types";
import { calcRemaining } from "./constants";
import type { SalesDocumentBranding } from "./company-branding";
import { resolveSalesDocumentBranding } from "./company-branding";
import { formatPaymentMethod, paymentDocumentInvoiceId } from "./utils";

export function toInvoicePreview(
  invoice: ApiInvoice,
  customerName?: string,
): SalesInvoice {
  return {
    id: invoice.id,
    number: invoice.number,
    customer: customerName ?? invoice.customerName ?? `Customer #${invoice.customerId}`,
    customerId: invoice.customerId,
    projectId: invoice.projectId ?? undefined,
    projectName: invoice.projectName ?? undefined,
    installmentId: invoice.installmentId ?? undefined,
    installmentName: invoice.installmentName ?? undefined,
    amount: invoice.amount,
    calculatedAmount: invoice.calculatedAmount ?? null,
    totalAdjustment: invoice.totalAdjustment ?? 0,
    adjustedTotal: invoice.adjustedTotal ?? null,
    paidAmount: invoice.paidAmount,
    status: invoice.status,
    dueDate: invoice.dueDate,
    issueDate: invoice.issueDate ?? null,
    createdAt: invoice.createdAt,
    lineItems: invoice.lineItems,
    notes: invoice.notes ?? null,
    terms: invoice.terms ?? null,
    gstEnabled: invoice.gstEnabled !== false,
  };
}

export function paymentToPartial(p: SalesPayment): PartialPayment {
  const docInvoiceId = paymentDocumentInvoiceId(p);
  return {
    id: p.id,
    installmentId: p.installmentId ?? 0,
    amount: p.amount,
    mode: formatPaymentMethod(p.paymentMethod),
    transactionId: p.transactionId ?? "—",
    paymentDate: p.paymentDate ?? null,
    createdAt: p.createdAt ?? null,
    status: "received",
    receiptId: p.id,
    receiptNumber: p.receiptNumber,
    invoiceId: docInvoiceId,
    invoiceNumber: p.invoiceNumber,
  };
}

export function toReceiptPreview(
  payment: SalesPayment,
  invoice: ApiInvoice,
  customer: Customer | null | undefined,
  branding?: SalesDocumentBranding,
  installmentName?: string | null,
): PaymentReceipt {
  const remaining = calcRemaining(invoice.amount, invoice.paidAmount);
  const resolved = branding ?? resolveSalesDocumentBranding();
  return {
    id: payment.id,
    number: payment.receiptNumber,
    invoiceNumber: invoice.number,
    installmentName: installmentName ?? (payment.installmentId ? `Installment #${payment.installmentId}` : "—"),
    customerName: customer?.companyName ?? `Customer #${payment.customerId}`,
    projectName: invoice.projectName
      ? invoice.projectName
      : invoice.projectId
        ? `Project #${invoice.projectId}`
        : "—",
    amountPaid: payment.amount,
    remainingBalance: remaining,
    paymentMethod: formatPaymentMethod(payment.paymentMethod),
    transactionId: payment.transactionId ?? "—",
    note: payment.note?.trim() || null,
    proofImageUrl: payment.proofImageUrl?.trim() || null,
    generatedAt: payment.paymentDate ?? payment.createdAt,
    companyName: resolved.companyName,
    companyAddress: resolved.address,
    companyGstin: resolved.gstin,
    companyPhone: resolved.phone,
    companyEmail: resolved.email,
    logoUrl: resolved.logoUrl,
    sealUrl: resolved.sealUrl,
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
    projectId: inst.projectId ?? undefined,
    customerId: inst.customerId,
    customerName: inst.customerName ?? undefined,
    sequenceNumber: inst.sequenceNumber ?? undefined,
    sequenceTotal: inst.sequenceTotal ?? undefined,
    invoiceId: inst.invoiceId ?? undefined,
    createdAt: inst.createdAt,
  };
}
