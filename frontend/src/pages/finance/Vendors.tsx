import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Building2, FileText, Globe, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell, PortalKpiGrid } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import {
  FinancePageHeader,
  FinanceFilterBar,
  FinanceErrorState,
  VendorFormModal,
  FinanceConfirmDialog,
} from "@/modules/finance/components";
import { FinanceListPageSkeleton } from "@/components/loading";
import { useListVendors, useDeleteVendor, type FinanceVendor } from "@/api/finance";
import { usePermissions } from "@/modules/permissions/usePermission";
import { toastApiError } from "@/lib/api-error";
import { toast } from "sonner";
import { formatVendorFieldsSummary, ensureHttpUrl } from "@/modules/finance/vendor-utils";

export default function FinanceVendorsPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<FinanceVendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FinanceVendor | null>(null);
  const { can } = usePermissions();
  const canEdit = can("finance_vendors", "edit");
  const canDelete = can("finance_vendors", "delete");
  const deleteVendor = useDeleteVendor();
  const { data, isLoading, isError, refetch } = useListVendors(
    search ? { search } : undefined,
  );

  const vendors = useMemo(() => data?.vendors ?? [], [data?.vendors]);
  const withGst = useMemo(() => vendors.filter((v) => Boolean(v.gstin)).length, [vendors]);
  const withWebsite = useMemo(() => vendors.filter((v) => Boolean(v.website)).length, [vendors]);
  const withPhone = useMemo(() => vendors.filter((v) => Boolean(v.phone)).length, [vendors]);

  const openCreate = () => {
    setEditVendor(null);
    setModalOpen(true);
  };

  // Deep-link from CA: /finance/vendors?create=1
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("create") === "1") {
      openCreate();
    }
  }, []);

  const openEdit = (vendor: FinanceVendor) => {
    setEditVendor(vendor);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteVendor.mutateAsync(deleteTarget.id);
      toast.success(`Vendor "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      toastApiError(err, "Failed to delete vendor");
    }
  };

  if (isLoading) return <FinanceListPageSkeleton kpiCount={4} />;
  if (isError) {
    return (
      <PortalPageShell>
        <FinanceErrorState onRetry={() => refetch()} />
      </PortalPageShell>
    );
  }

  const columns: CmsColumn<FinanceVendor>[] = [
    {
      id: "vendor",
      header: "Vendor",
      cell: (vendor) => (
        <Link href={`/finance/vendors/${vendor.id}`} className="font-medium whitespace-nowrap hover:text-primary hover:underline">
          {vendor.name}
        </Link>
      ),
    },
    {
      id: "contact",
      header: "Contact",
      cell: (vendor) => (
        <div className="text-muted-foreground">
          <div>{vendor.email}</div>
          {vendor.phone ? <div className="text-[10px]">{vendor.phone}</div> : null}
        </div>
      ),
    },
    {
      id: "service-details",
      header: "Service details",
      className: "max-w-[280px]",
      cell: (vendor) => (
        <p className="truncate text-muted-foreground" title={formatVendorFieldsSummary(vendor.fields, vendor.notes, 4)}>
          {formatVendorFieldsSummary(vendor.fields, vendor.notes)}
        </p>
      ),
    },
    { id: "gstin", header: "GSTIN", cell: (vendor) => <span className="font-mono">{vendor.gstin ?? "—"}</span> },
    {
      id: "website",
      header: "Website",
      cell: (vendor) =>
        vendor.website ? (
          <a href={ensureHttpUrl(vendor.website) ?? "#"} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block max-w-[160px]">
            {vendor.website.replace(/^https?:\/\//, "")}
          </a>
        ) : "—",
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (vendor) => (
        <div className="flex justify-end gap-1">
          {canEdit && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(vendor)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteTarget(vendor)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

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

      <PortalKpiGrid
        items={[
          { title: "Vendors", value: vendors.length, icon: Building2, accent: "blue", delay: 0 },
          { title: "With GSTIN", value: withGst, icon: FileText, accent: "violet", delay: 1 },
          { title: "With website", value: withWebsite, icon: Globe, accent: "sky", delay: 2 },
          { title: "With phone", value: withPhone, icon: Phone, accent: "green", delay: 3 },
        ]}
      />

      <FinanceFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name, email, GSTIN, service details…"
      />

      <CmsDataTable
        columns={columns}
        rows={vendors}
        rowKey={(vendor) => vendor.id}
        viewStorageKey="finance-vendors"
        empty={{
          icon: Building2,
          title: "No vendors yet",
          description: "Add AWS, your hosting provider, or any service you pay on a recurring basis.",
          actionLabel: "Add vendor",
          onAction: openCreate,
        }}
      />

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
      <FinanceConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete vendor?"
        description={deleteTarget ? `"${deleteTarget.name}" will be removed. Vendors used by expenses or payments can't be deleted.` : undefined}
        loading={deleteVendor.isPending}
        onConfirm={handleDelete}
      />
    </PortalPageShell>
  );
}
