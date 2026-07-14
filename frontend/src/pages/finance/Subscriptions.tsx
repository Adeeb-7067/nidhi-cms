import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { KeyRound, Plus, Pencil, Trash2, Eye, AlertTriangle } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        (s.vendorName ?? "").toLowerCase().includes(q);
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

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {(["all", "active", "cancelled"] as const).map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize data-[state=active]:bg-primary/10">
              {t === "all" ? "All" : t} (
              {t === "all"
                ? subscriptions.length
                : subscriptions.filter((s) => s.status === (t as SubscriptionStatus)).length}
              )
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <FinanceEmptyState
          icon={KeyRound}
          title="No subscriptions yet"
          description="Add Cursor, Claude, or any tool you provide to employees."
          actionLabel="Add subscription"
          onAction={() => setDrawerOpen(true)}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Tool</TableHead>
                <TableHead className="text-xs">Billing</TableHead>
                <TableHead className="text-xs">Seats</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Renewal</TableHead>
                <TableHead className="text-xs text-right">Cost / cycle</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">
                    <Link href={`/finance/subscriptions/${s.id}`} className="hover:text-primary">
                      <div className="font-medium">{s.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{s.reference}</div>
                      {s.vendorName && (
                        <div className="text-[10px] text-muted-foreground">{s.vendorName}{s.plan ? ` · ${s.plan}` : ""}</div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs capitalize">
                    {SUBSCRIPTION_BILLING_LABELS[s.billingCycle]}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {s.seatsUsed}/{s.seatsPurchased}
                    {s.seatsAvailable === 0 && s.status === "active" && (
                      <span className="ml-1 text-[10px] text-amber-700">full</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <FinanceStatusBadge variant="subscription" value={s.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.renewalDate ? format(new Date(s.renewalDate), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-right tabular-nums font-medium">
                    {formatCurrency(s.costAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild title="View">
                        <Link href={`/finance/subscriptions/${s.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => { setEditSub(s); setDrawerOpen(true); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => setDeleteTarget(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
