import { useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/modules/finance/constants";
import {
  FinancePageHeader,
  FinanceEmptyState,
  VendorFormModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceDetailPageSkeleton } from "@/components/loading";
import {
  useGetVendor,
  useDeleteVendor,
  useVendorLedgers,
} from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { ensureHttpUrl } from "@/modules/finance/vendor-utils";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";

export default function VendorDetailPage() {
  const [, params] = useRoute("/finance/vendors/:id");
  const [, setLocation] = useLocation();
  const vendorId = Number(params?.id);
  const { data: vendor, isLoading, isError, refetch } = useGetVendor(vendorId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteVendor = useDeleteVendor();
  const { can } = usePermissions();
  const canEdit = can("finance_vendors", "edit");
  const canDelete = can("finance_vendors", "delete");
  const canViewLedgers = can("finance_ledgers", "view");
  const { data: ledgerData } = useVendorLedgers(
    vendorId,
    Number.isFinite(vendorId) && vendorId > 0 && canViewLedgers,
  );

  const ledger = ledgerData?.accounts?.[0] ?? null;
  const entries = ledger?.entries ?? [];
  const fields = (vendor?.fields ?? []).filter((f) => f.label?.trim() && f.value?.trim());

  const handleDelete = async () => {
    if (!vendor) return;
    try {
      await deleteVendor.mutateAsync(vendor.id);
      toast.success(`Vendor "${vendor.name}" deleted`);
      setDeleteOpen(false);
      setLocation("/finance/vendors");
    } catch (err) {
      toastApiError(err, "Failed to delete vendor");
    }
  };

  if (isLoading) return <FinanceDetailPageSkeleton />;

  if (isError || !vendor) {
    return (
      <PortalPageShell>
        <FinanceEmptyState
          title="Vendor not found"
          description={`No vendor #${vendorId}.`}
          actionLabel="Back to vendors"
          onAction={() => {
            window.location.href = "/finance/vendors";
          }}
        />
      </PortalPageShell>
    );
  }

  const websiteHref = ensureHttpUrl(vendor.website);

  return (
    <PortalPageShell>
      <FinancePageHeader
        title={vendor.name}
        description={vendor.email}
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Vendors", href: "/finance/vendors" },
          { label: vendor.name },
        ]}
        actions={
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/finance/vendors">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Link>
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            )}
          </>
        }
      />

      <PortalKpiGrid
        columns={canViewLedgers ? 3 : 2}
        items={[
          ...(canViewLedgers
            ? [
                {
                  title: "Ledger balance",
                  value: formatCurrency(ledger?.closingBalance ?? 0),
                  icon: BookOpen,
                  accent: "blue" as const,
                  delay: 0,
                },
                {
                  title: "Transactions",
                  value: entries.length,
                  icon: Building2,
                  accent: "violet" as const,
                  delay: 1,
                },
              ]
            : []),
          {
            title: "Service fields",
            value: fields.length,
            icon: Globe,
            accent: "amber" as const,
            delay: canViewLedgers ? 2 : 0,
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="flex gap-2 min-w-0">
                <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">Email</dt>
                  <dd className="font-medium truncate">
                    <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                      {vendor.email}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-2 min-w-0">
                <User className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">Contact person</dt>
                  <dd className="font-medium">{vendor.contactPerson?.trim() || "—"}</dd>
                </div>
              </div>
              <div className="flex gap-2 min-w-0">
                <Phone className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">Phone</dt>
                  <dd className="font-medium">
                    {vendor.phone ? (
                      <a href={`tel:${vendor.phone}`} className="hover:underline">
                        {vendor.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex gap-2 min-w-0">
                <Globe className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">Website</dt>
                  <dd className="font-medium truncate">
                    {websiteHref ? (
                      <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {vendor.website!.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex gap-2 min-w-0 sm:col-span-2">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">Address</dt>
                  <dd className="font-medium">{vendor.address?.trim() || "—"}</dd>
                </div>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] text-muted-foreground">GSTIN</dt>
                <dd className="font-mono text-sm">{vendor.gstin ?? "—"}</dd>
              </div>
            </dl>
            {(vendor.createdAt || vendor.updatedAt) && (
              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/60">
                {vendor.createdAt && <>Added {format(new Date(vendor.createdAt), "MMM d, yyyy")}</>}
                {vendor.createdAt && vendor.updatedAt && " · "}
                {vendor.updatedAt && <>Updated {format(new Date(vendor.updatedAt), "MMM d, yyyy")}</>}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Service details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {fields.length === 0 && !vendor.notes?.trim() ? (
              <p className="text-xs text-muted-foreground">No service details yet.</p>
            ) : (
              <>
                {fields.length > 0 && (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {fields.map((field) => (
                      <div key={`${field.label}:${field.value}`}>
                        <dt className="text-[11px] text-muted-foreground">{field.label}</dt>
                        <dd className="font-medium break-words">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {vendor.notes?.trim() ? (
                  <div className={fields.length ? "pt-2 border-t border-border/60" : undefined}>
                    <dt className="text-[11px] text-muted-foreground mb-1">Notes</dt>
                    <dd className="text-sm whitespace-pre-wrap">{vendor.notes}</dd>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {canViewLedgers && (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Vendor ledger
            </CardTitle>
            {ledger && (
              <div className="flex gap-4 text-xs">
                <span>
                  <span className="text-muted-foreground">Opening:</span>{" "}
                  <strong className="tabular-nums">{formatCurrency(ledger.openingBalance)}</strong>
                </span>
                <span>
                  <span className="text-muted-foreground">Closing:</span>{" "}
                  <strong className="tabular-nums">{formatCurrency(ledger.closingBalance)}</strong>
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No expenses or payments linked to this vendor yet.
            </p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs text-right">Debit</TableHead>
                    <TableHead className="text-xs text-right">Credit</TableHead>
                    <TableHead className="text-xs text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(entry.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-xs">{entry.description}</TableCell>
                      <TableCell className="text-xs">
                        {entry.referenceHref ? (
                          <Link
                            href={entry.referenceHref}
                            className="font-mono text-primary hover:underline inline-flex items-center gap-0.5"
                          >
                            {entry.reference} <ArrowRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="font-mono text-muted-foreground">{entry.reference}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {entry.debit ? formatCurrency(entry.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {entry.credit ? formatCurrency(entry.credit) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums font-medium">
                        {formatCurrency(entry.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <VendorFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        vendor={vendor}
        onSuccess={() => {
          void refetch();
        }}
      />
      <FinanceConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete vendor?"
        description={`"${vendor.name}" will be removed. Vendors used by expenses or payments can't be deleted.`}
        loading={deleteVendor.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
