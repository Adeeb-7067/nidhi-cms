import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Download,
  ExternalLink,
  Plus,
  Wallet,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { useListPayments, type FinancePayment } from "@/api/finance";
import { formatCompactCurrency, formatCurrency } from "@/modules/ca/constants";
import type { PeriodFilter } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CaRefLink, CaRowActions } from "@/modules/ca/components";
import {
  FinanceSourceBadge,
  FinanceStatusBadge,
  GstClassificationBadge,
} from "@/modules/finance/components";
import {
  filterByPeriod,
  financePaymentModeLabel,
  isPaymentGst,
  PARTY_TYPE_LABELS,
  paymentDetailHref,
  paymentDocumentLinks,
  summarizeCaPayments,
} from "@/modules/ca/adapters/finance";
import { financePaymentsListHref } from "@/modules/ca/routes";

type DirectionTab = "all" | "incoming" | "outgoing";

function readDirectionFromUrl(): DirectionTab {
  if (typeof window === "undefined") return "all";
  const d = new URLSearchParams(window.location.search).get("direction");
  return d === "incoming" || d === "outgoing" ? d : "all";
}

export default function ClientPayments() {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PeriodFilter>("monthly");
  const [directionTab, setDirectionTab] = useState<DirectionTab>(readDirectionFromUrl);

  useEffect(() => {
    const sync = () => setDirectionTab(readDirectionFromUrl());
    window.addEventListener("popstate", sync);
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement | null)?.closest?.("a");
      if (!a?.href) return;
      try {
        const u = new URL(a.href);
        if (u.pathname === "/ca/client-payments") queueMicrotask(sync);
      } catch {
        /* ignore invalid href */
      }
    };
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", sync);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (directionTab === "all") url.searchParams.delete("direction");
    else url.searchParams.set("direction", directionTab);
    const next = url.pathname + (url.search || "");
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState({}, "", next);
    }
  }, [directionTab]);

  const { data, isLoading, isError, refetch } = useListPayments({
    search: search || undefined,
    limit: 1000,
  });

  const allPayments = useMemo(() => data?.payments ?? [], [data?.payments]);

  const periodPayments = useMemo(
    () => filterByPeriod(allPayments, period),
    [allPayments, period],
  );

  const payments = useMemo(() => {
    if (directionTab === "all") return periodPayments;
    return periodPayments.filter((p) => p.direction === directionTab);
  }, [periodPayments, directionTab]);

  const summary = useMemo(() => summarizeCaPayments(periodPayments), [periodPayments]);

  const columns = useMemo<CmsColumn<FinancePayment>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: (p) => (
          <CaRefLink href={paymentDetailHref(p)}>
            {format(new Date(p.date), "MMM d, yyyy")}
          </CaRefLink>
        ),
      },
      {
        id: "direction",
        header: "Flow",
        cell: (p) =>
          p.direction === "incoming" ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <ArrowDownLeft className="h-3 w-3" /> In
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 text-xs font-medium">
              <ArrowUpRight className="h-3 w-3" /> Out
            </span>
          ),
      },
      {
        id: "source",
        header: "Source",
        chip: true,
        cell: (p) => <FinanceSourceBadge source={p.source} />,
      },
      {
        id: "party",
        header: "Party",
        className: "max-w-[180px]",
        cell: (p) => (
          <>
            <div className="font-medium truncate">{p.partyName || "—"}</div>
            <div className="text-[10px] text-muted-foreground">
              {PARTY_TYPE_LABELS[p.partyType] ?? p.partyType}
            </div>
          </>
        ),
      },
      {
        id: "reference",
        header: "Reference",
        cell: (p) => (
          <div className="space-y-0.5">
            <CaRefLink href={paymentDetailHref(p)} mono>
              {p.receiptNumber || p.reference || `PMT-${p.id}`}
            </CaRefLink>
            {p.reference && p.receiptNumber && p.reference !== p.receiptNumber ? (
              <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]">
                UTR {p.reference}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "linked",
        header: "Linked to",
        className: "max-w-[160px]",
        cell: (p) => {
          const links = paymentDocumentLinks(p);
          if (!links.length) {
            return <span className="text-muted-foreground text-xs">Unlinked</span>;
          }
          return (
            <div className="space-y-0.5">
              {links.slice(0, 2).map((l) =>
                l.href ? (
                  <CaRefLink key={`${l.kind}-${l.label}`} href={l.href} className="block text-xs truncate">
                    {l.label}
                  </CaRefLink>
                ) : (
                  <div key={`${l.kind}-${l.label}`} className="text-xs truncate">
                    {l.label}
                  </div>
                ),
              )}
              {links.length > 2 ? (
                <div className="text-[10px] text-muted-foreground">+{links.length - 2} more</div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "mode",
        header: "Mode",
        cell: (p) => <span className="text-xs">{financePaymentModeLabel(p.mode)}</span>,
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (p) => <FinanceStatusBadge variant="payment" value={p.status} />,
      },
      {
        id: "gst",
        header: "GST",
        chip: true,
        cell: (p) =>
          p.direction === "incoming" ? (
            <>
              <GstClassificationBadge gstEnabled={p.gstEnabled} />
              {isPaymentGst(p) && (p.gstAmount ?? 0) > 0 ? (
                <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                  {formatCurrency(Number(p.gstAmount))}
                </div>
              ) : null}
            </>
          ) : (
            <span className="text-muted-foreground text-xs">Cash only</span>
          ),
      },
      {
        id: "taxable",
        header: "Taxable",
        align: "right",
        cell: (p) =>
          p.direction === "incoming" && isPaymentGst(p) ? (
            <span className="tabular-nums text-muted-foreground text-xs">
              {formatCurrency(Number(p.taxableAmount ?? p.amount - (p.gstAmount ?? 0)))}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "amount",
        header: "Amount",
        align: "right",
        cell: (p) => (
          <span
            className={`font-medium tabular-nums ${
              p.direction === "incoming"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {formatCurrency(Number(p.amount))}
          </span>
        ),
      },
      {
        id: "recorded",
        header: "Recorded by",
        cell: (p) => (
          <span className="text-xs text-muted-foreground truncate max-w-[100px] block">
            {p.recordedByName || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (p) => {
          const href = paymentDetailHref(p);
          return (
            <CaRowActions
              canView
              canEdit={false}
              canDelete={false}
              onView={() => {
                window.location.href = href;
              }}
            />
          );
        },
      },
    ],
    [],
  );

  const incomingCount = periodPayments.filter((p) => p.direction === "incoming").length;
  const outgoingCount = periodPayments.filter((p) => p.direction === "outgoing").length;

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Payments ledger"
        description="Every incoming and outgoing Finance cash movement — GST, links, mode, and status without remapping mistakes"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Payments" }]}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
              <Link href={financePaymentsListHref({ direction: directionTab === "all" ? undefined : directionTab })}>
                <Download className="h-3.5 w-3.5" /> Open Finance
              </Link>
            </Button>
            <Button size="sm" className="h-8 gap-1.5" asChild>
              <Link href={financePaymentsListHref({ direction: directionTab === "outgoing" ? "outgoing" : "incoming", create: true })}>
                <Plus className="h-3.5 w-3.5" /> Record payment
                <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            </Button>
          </div>
        }
      />
      <CAFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search party, receipt, UTR…"
        period={period}
        onPeriodChange={setPeriod}
      />
      <PortalKpiGrid
        columns={3}
        items={[
          {
            title: "Incoming (completed)",
            value: formatCompactCurrency(summary.incoming),
            icon: ArrowDownLeft,
            accent: "green",
            delay: 0,
          },
          {
            title: "Outgoing (completed)",
            value: formatCompactCurrency(summary.outgoing),
            icon: ArrowUpRight,
            accent: "red",
            delay: 1,
          },
          {
            title: "Net cash",
            value: formatCompactCurrency(summary.net),
            icon: Wallet,
            accent: "blue",
            delay: 2,
          },
          {
            title: "GST incoming",
            value: formatCompactCurrency(summary.gstIncoming),
            icon: CreditCard,
            accent: "blue",
            delay: 3,
          },
          {
            title: "Non-GST incoming",
            value: formatCompactCurrency(summary.nonGstIncoming),
            icon: CreditCard,
            accent: "violet",
            delay: 4,
          },
          {
            title: "GST tax collected",
            value: formatCompactCurrency(summary.gstTaxCollected),
            icon: CreditCard,
            accent: "amber",
            delay: 5,
          },
        ]}
      />
      <CmsChipTabs
        value={directionTab}
        onValueChange={(v) => setDirectionTab(v as DirectionTab)}
        items={[
          { value: "all", label: "All", count: periodPayments.length },
          { value: "incoming", label: "Incoming", count: incomingCount },
          { value: "outgoing", label: "Outgoing", count: outgoingCount },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={payments}
        rowKey={(p) => `${p.source ?? "finance"}-${p.id}`}
        isLoading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        onRowClick={(p) => {
          window.location.href = paymentDetailHref(p);
        }}
        empty={{
          icon: CreditCard,
          title: "No payments found",
          description: "Completed Finance and Sales receipts appear here for the selected period.",
          actionLabel: "Open Finance payments",
          onAction: () => {
            window.location.href = financePaymentsListHref();
          },
        }}
      />
    </PortalPageShell>
  );
}
