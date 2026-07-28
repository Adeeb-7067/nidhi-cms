import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, type CmsColumn } from "@/components/cms";
import { useListVendors, type FinanceVendor } from "@/api/finance";
import { CAPageHeader, CAFilterBar, CaRefLink, CaRowActions } from "@/modules/ca/components";
import { financeVendorHref, financeVendorsListHref } from "@/modules/ca/routes";

export default function Vendors() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useListVendors(
    search.trim() ? { search: search.trim() } : undefined,
  );
  const vendors = data?.vendors ?? [];

  const columns = useMemo<CmsColumn<FinanceVendor>[]>(
    () => [
      {
        id: "name",
        header: "Vendor",
        cell: (v) => (
          <CaRefLink href={financeVendorHref(v.id)}>{v.name}</CaRefLink>
        ),
      },
      {
        id: "gstin",
        header: "GSTIN",
        cell: (v) => <span className="font-mono">{v.gstin || "—"}</span>,
      },
      {
        id: "contact",
        header: "Contact",
        cell: (v) => <span className="text-muted-foreground">{v.contactPerson || "—"}</span>,
      },
      {
        id: "email",
        header: "Email",
        cell: (v) => <span className="text-muted-foreground">{v.email || "—"}</span>,
      },
      {
        id: "phone",
        header: "Phone",
        cell: (v) => <span className="text-muted-foreground">{v.phone || "—"}</span>,
      },
      {
        id: "updated",
        header: "Updated",
        cell: (v) => (
          <span className="text-muted-foreground">
            {v.updatedAt ? format(new Date(v.updatedAt), "MMM d, yyyy") : "—"}
          </span>
        ),
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
        title="Vendor summary"
        description="Live vendors from Finance — open a row to manage in Finance"
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
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search vendors, GSTIN…" />
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
          title: "No vendors found",
          actionLabel: "Open Finance vendors",
          onAction: () => {
            window.location.href = financeVendorsListHref();
          },
        }}
      />
    </PortalPageShell>
  );
}
