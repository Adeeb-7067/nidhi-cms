import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { KeyRound, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsRowActions, type CmsColumn } from "@/components/cms";
import {
  formatCurrency,
  SUBSCRIPTION_BILLING_LABELS,
} from "@/modules/finance/constants";
import type { SubscriptionStatus } from "@/modules/finance/types";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceStatusBadge,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceConfirmDialog,
  SubscriptionFormModal,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import {
  useListSubscriptions,
  useDeleteSubscription,
  type SoftwareSubscription,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

export default function SubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSub, setEditSub] = useState<SoftwareSubscription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SoftwareSubscription | null>(null);
  const { can } = usePermissions();
  const canEdit = can("finance_subscriptions", "edit");
  const canDelete = can("finance_subscriptions", "delete");
  const deleteSub = useDeleteSubscription();
  const { data, isLoading, isError, refetch } = useListSubscriptions();
  const subscriptions = data?.subscriptions ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return subscriptions.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.reference.toLowerCase().includes(q) ||
        (s.vendorName ?? "").toLowerCase().includes(q) ||
        (s.purchaseEmail ?? "").toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || s.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, search, statusTab]);

  const active = subscriptions.filter((s) => s.status === "active");
  const seatsUsed = active.reduce((n, s) => n + s.seatsUsed, 0);
  const seatsBought = active.reduce((n, s) => n + s.seatsPurchased, 0);
  const monthlyCost = active.reduce((n, s) => {
    if (s.billingCycle === "yearly") return n + s.costAmount / 12;
    return n + s.costAmount;
  }, 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSub.mutateAsync(deleteTarget.id);
      toast.success(`${deleteTarget.reference} deleted`);
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete subscription");
    }
  };

  if (isLoading) return <FinanceListPageSkeleton kpiCount={3} />;
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  const chipItems = (["all", "active", "cancelled"] as const).map((value) => ({
    value,
    label: value === "all" ? "All" : value,
    count: value === "all" ? subscriptions.length : subscriptions.filter((s) => s.status === value).length,
  }));
  const columns: CmsColumn<SoftwareSubscription>[] = [
    { id: "tool", header: "Tool", cell: (s) => <Link href={`/finance/subscriptions/${s.id}`} className="hover:text-primary"><div className="font-medium">{s.name}</div><div className="font-mono text-[10px] text-muted-foreground">{s.reference}</div>{s.vendorName && <div className="text-[10px] text-muted-foreground">{s.vendorName}{s.plan ? ` · ${s.plan}` : ""}</div>}</Link> },
    { id: "billing", header: "Billing", cell: (s) => <span className="capitalize">{SUBSCRIPTION_BILLING_LABELS[s.billingCycle]}</span> },
    { id: "seats", header: "Seats", cell: (s) => <span className="tabular-nums">{s.seatsUsed}/{s.seatsPurchased}{s.seatsAvailable === 0 && s.status === "active" && <span className="ml-1 text-[10px] text-amber-700">full</span>}</span> },
    { id: "status", header: "Status", chip: true, cell: (s) => <FinanceStatusBadge variant="subscription" value={s.status} /> },
    { id: "bought-on", header: "Bought on", cell: (s) => <span className="text-muted-foreground">{s.createdAt ? format(new Date(s.createdAt), "MMM d, yyyy") : "—"}</span> },
    { id: "purchase-email", header: "Purchase email", className: "max-w-[180px]", cell: (s) => <span className="truncate text-muted-foreground" title={s.purchaseEmail ?? undefined}>{s.purchaseEmail || "—"}</span> },
    { id: "renewal", header: "Renewal", cell: (s) => <span className="text-muted-foreground">{s.renewalDate ? format(new Date(s.renewalDate), "MMM d, yyyy") : "—"}</span> },
    { id: "cost", header: "Cost / cycle", align: "right", cell: (s) => <span className="font-medium tabular-nums">{formatCurrency(s.costAmount)}</span> },
    { id: "actions", header: "Actions", align: "right", cell: (s) => (
      <CmsRowActions
        label="Subscription actions"
        viewHref={`/finance/subscriptions/${s.id}`}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={() => { setEditSub(s); setDrawerOpen(true); }}
        onDelete={() => setDeleteTarget(s)}
      />
    ) },
  ];

  return (
    <PortalPageShell>
      <FinancePageHeader
        title="Subscriptions"
        description="Company software seats — Cursor, Claude, and other tools."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Subscriptions" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={() => { setEditSub(null); setDrawerOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Add subscription
          </Button>
        }
      />

      <PortalKpiGrid
        items={[
          { title: "Active tools", value: active.length, icon: KeyRound, accent: "blue", delay: 0 },
          { title: "Seats used", value: `${seatsUsed} / ${seatsBought}`, icon: KeyRound, accent: "violet", delay: 1 },
          {
            title: "Est. monthly cost",
            value: formatCurrency(Math.round(monthlyCost)),
            icon: AlertTriangle,
            accent: "amber",
            delay: 2,
          },
        ]}
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, vendor, reference…"
      />

      <CmsChipTabs value={statusTab} onValueChange={setStatusTab} items={chipItems} />

      <CmsDataTable columns={columns} rows={filtered} rowKey={(s) => s.id} empty={{ icon: KeyRound, title: "No subscriptions yet", description: "Add Cursor, Claude, or any tool you provide to employees.", actionLabel: "Add subscription", onAction: () => setDrawerOpen(true) }} />

      <SubscriptionFormModal
        key={editSub ? `edit-${editSub.id}` : "create"}
        open={drawerOpen}
        onOpenChange={(open) => { setDrawerOpen(open); if (!open) setEditSub(null); }}
        subscription={editSub}
        onSuccess={() => { refetch(); setEditSub(null); }}
      />
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete subscription?"
        description={
          deleteTarget
            ? `${deleteTarget.reference} will be removed. Revoke seats and clear linked expenses first if needed.`
            : undefined
        }
        loading={deleteSub.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
