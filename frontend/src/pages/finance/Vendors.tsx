import { useMemo, useState } from "react";
import { Building2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceEmptyState,
  FinanceErrorState,
  VendorFormModal,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListVendors, type FinanceVendor } from "@/api/finance";
import { formatVendorFieldsSummary, ensureHttpUrl } from "@/modules/finance/vendor-utils";

export default function FinanceVendorsPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<FinanceVendor | null>(null);
  const { data, isLoading, isError, refetch } = useListVendors(
    search ? { search } : undefined,
  );

  const vendors = useMemo(() => data?.vendors ?? [], [data?.vendors]);

  const openCreate = () => {
    setEditVendor(null);
    setModalOpen(true);
  };

  const openEdit = (vendor: FinanceVendor) => {
    setEditVendor(vendor);
    setModalOpen(true);
  };

  if (isLoading) return <FinanceListPageSkeleton kpiCount={0} />;
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
        title="Vendors"
        description="Service providers you pay — cloud, hosting, domains, SaaS, and other suppliers."
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Vendors" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Add vendor
          </Button>
        }
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, GSTIN, service details…"
      />

      {vendors.length === 0 ? (
        <FinanceEmptyState
          icon={Building2}
          title="No vendors yet"
          description="Add AWS, your hosting provider, or any service you pay on a recurring basis."
          actionLabel="Add vendor"
          onAction={openCreate}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs whitespace-nowrap min-w-[160px]">Vendor</TableHead>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">Service details</TableHead>
                <TableHead className="text-xs">GSTIN</TableHead>
                <TableHead className="text-xs">Website</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium whitespace-nowrap">{vendor.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{vendor.email}</div>
                    {vendor.phone ? <div className="text-[10px]">{vendor.phone}</div> : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[280px]">
                    <p className="truncate" title={formatVendorFieldsSummary(vendor.fields, vendor.notes, 4)}>
                      {formatVendorFieldsSummary(vendor.fields, vendor.notes)}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{vendor.gstin ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {vendor.website ? (
                      <a href={ensureHttpUrl(vendor.website) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-[160px]">
                        {vendor.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(vendor)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VendorFormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditVendor(null);
        }}
        vendor={editVendor}
        onSuccess={() => {
          void refetch();
          setEditVendor(null);
        }}
      />
    </PortalPageShell>
  );
}
