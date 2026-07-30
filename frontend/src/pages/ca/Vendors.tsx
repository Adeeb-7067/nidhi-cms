import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import {
  useListPayments,
  useListVendors,
  type FinanceVendor,
} from "@/api/finance";
import { formatCompactCurrency, formatCurrency } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar, CaRefLink, CaRowActions } from "@/modules/ca/components";
import { financeVendorHref, financeVendorsListHref } from "@/modules/ca/routes";

type VendorRow = FinanceVendor & {
  paidOut: number;
  lastPaymentAt: string | null;
  paymentCount: number;
  hasGstin: boolean;
};

export default function Vendors() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useListVendors(
    search.trim() ? { search: search.trim() } : undefined,
  );
  const { data: paymentsData } = useListPayments({ direction: "outgoing", limit: 1000 });

  const payByVendor = useMemo(() => {
    const map = new Map<number, { paidOut: number; lastPaymentAt: string | null; paymentCount: number }>();
    for (const p of paymentsData?.payments ?? []) {
      if (!p.vendorId || p.status === "failed") continue;
      const cur = map.get(p.vendorId) ?? { paidOut: 0, lastPaymentAt: null, paymentCount: 0 };
      if (p.status === "completed") {
        cur.paidOut += Number(p.amount ?? 0);
        cur.paymentCount += 1;
        const d = p.date;
        if (d && (!cur.lastPaymentAt || new Date(d) > new Date(cur.lastPaymentAt))) {
          cur.lastPaymentAt = d;
        }
      }
      map.set(p.vendorId, cur);
    }
    return map;
  }, [paymentsData?.payments]);

  const vendors = useMemo<VendorRow[]>(() => {
    return (data?.vendors ?? []).map((v) => {
      const pay = payByVendor.get(v.id);
      return {
        ...v,
        paidOut: pay?.paidOut ?? 0,
        lastPaymentAt: pay?.lastPaymentAt ?? null,
        paymentCount: pay?.paymentCount ?? 0,
        hasGstin: Boolean(v.gstin && String(v.gstin).trim()),
      };
    });
  }, [data?.vendors, payByVendor]);

  const summary = useMemo(() => {
    let withGstin = 0;
    let paidOut = 0;
    let activePayees = 0;
    for (const v of vendors) {
      if (v.hasGstin) withGstin += 1;
      paidOut += v.paidOut;
      if (v.paymentCount > 0) activePayees += 1;
    }
    return { withGstin, paidOut, activePayees, total: vendors.length };
  }, [vendors]);

  const columns = useMemo<CmsColumn<VendorRow>[]>(
    () => [
      {
        id: "name",
        header: "Vendor",
        cell: (v) => (
          <div>
            <CaRefLink href={financeVendorHref(v.id)}>{v.name}</CaRefLink>
            {v.contactPerson ? (
              <div className="text-[10px] text-muted-foreground">{v.contactPerson}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "gstin",
        header: "GSTIN",
        cell: (v) =>
          v.hasGstin ? (
            <span className="font-mono text-xs">{v.gstin}</span>
          ) : (
            <CmsStatusChip label="Missing" tone="warning" />
          ),
      },
      {
        id: "paid",
        header: "Paid (out)",
        align: "right",
        cell: (v) => (
          <span className="tabular-nums font-medium">{formatCurrency(v.paidOut)}</span>
        ),
      },
      {
        id: "payments",
        header: "Payments",
        align: "right",
        cell: (v) => <span className="tabular-nums text-muted-foreground">{v.paymentCount}</span>,
      },
      {
        id: "lastPay",
        header: "Last payment",
        cell: (v) => (
          <span className="text-muted-foreground text-xs">
            {v.lastPaymentAt ? format(new Date(v.lastPaymentAt), "MMM d, yyyy") : "—"}
          </span>
        ),
      },
      {
        id: "email",
        header: "Email",
        cell: (v) => <span className="text-muted-foreground text-xs truncate max-w-[140px] block">{v.email || "—"}</span>,
      },
      {
        id: "actions",
        header: "",
        cell: (v) => (
          <CaRowActions
            canView
            canEdit
            canDelete={false}
            onView={() => {
              window.location.href = financeVendorHref(v.id);
            }}
            onEdit={() => {
              window.location.href = financeVendorHref(v.id);
            }}
          />
        ),
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Vendors"
        description="Payee master with GSTIN coverage and outgoing payment totals from Finance"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Vendors" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" asChild>
            <Link href={financeVendorsListHref({ create: true })}>
              <Plus className="h-3.5 w-3.5" /> Add in Finance
              <ExternalLink className="h-3 w-3 opacity-70" />
            </Link>
          </Button>
        }
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search vendors…" />
      <PortalKpiGrid
        columns={4}
        items={[
          { title: "Vendors", value: String(summary.total), icon: Building2, accent: "blue", delay: 0 },
          { title: "With GSTIN", value: String(summary.withGstin), icon: Building2, accent: "green", delay: 1 },
          { title: "Active payees", value: String(summary.activePayees), icon: Building2, accent: "violet", delay: 2 },
          { title: "Paid out", value: formatCompactCurrency(summary.paidOut), icon: Building2, accent: "amber", delay: 3 },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={vendors}
        rowKey={(v) => v.id}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        onRowClick={(v) => {
          window.location.href = financeVendorHref(v.id);
        }}
        empty={{
          icon: Building2,
          title: "No vendors",
          actionLabel: "Open Finance vendors",
          onAction: () => {
            window.location.href = financeVendorsListHref();
          },
        }}
      />
    </PortalPageShell>
  );
}
