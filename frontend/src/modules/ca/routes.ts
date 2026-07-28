/** Deep-link helpers — CA tables → Finance/CA detail or list pages. */

export function financeVendorHref(id: number) {
  return `/finance/vendors/${id}`;
}

export function financePaymentHref(id: number, source: "finance" | "sales" = "finance") {
  return `/finance/payments/${source}/${id}`;
}

export function financeInvoiceHref(id: number) {
  return `/finance/invoices/${id}`;
}

export function financeExpenseHref(
  id?: number | null,
  opts?: { search?: string | null; create?: boolean },
) {
  if (id) return `/finance/expenses?id=${id}`;
  const qs = new URLSearchParams();
  if (opts?.search) qs.set("search", opts.search);
  if (opts?.create) qs.set("create", "1");
  const q = qs.toString();
  return q ? `/finance/expenses?${q}` : "/finance/expenses";
}

export function financeTaxHref() {
  return "/finance/tax";
}

export function financePaymentsListHref(opts?: {
  direction?: "incoming" | "outgoing";
  create?: boolean;
}) {
  const qs = new URLSearchParams();
  if (opts?.direction) qs.set("direction", opts.direction);
  if (opts?.create) qs.set("create", "1");
  const q = qs.toString();
  return q ? `/finance/payments?${q}` : "/finance/payments";
}

export function financeVendorsListHref(opts?: { create?: boolean }) {
  if (opts?.create) return "/finance/vendors?create=1";
  return "/finance/vendors";
}

export function financeReportsPnlHref() {
  return "/finance/reports/pnl";
}

export function caNoticesHref(opts?: { search?: string; department?: string }) {
  const qs = new URLSearchParams();
  if (opts?.search) qs.set("search", opts.search);
  if (opts?.department) qs.set("department", opts.department);
  const q = qs.toString();
  return q ? `/ca/notices?${q}` : "/ca/notices";
}

export function caCalendarHref() {
  return "/ca/compliance-calendar";
}

export function caGstHref() {
  return "/ca/gst";
}

export function caTasksHref() {
  return "/ca/tasks";
}

/** Map compliance calendar category → dedicated CA page. */
export function caComplianceAreaHref(area: string) {
  switch (String(area || "").toUpperCase()) {
    case "GST":
      return "/ca/gst";
    case "TDS":
      return "/ca/tds";
    case "ROC":
      return "/ca/roc";
    case "ITR":
      return "/ca/company-itr";
    case "AUDIT":
      return "/ca/audit";
    default:
      return caCalendarHref();
  }
}

export function caNoticeDetailHref(reference?: string | null) {
  return caNoticesHref(reference ? { search: reference } : undefined);
}
