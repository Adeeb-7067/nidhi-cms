import { useMemo, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Building2, Plus } from "lucide-react";
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
import { mockCustomers } from "@/modules/sales/mock-data";
import { formatCurrency } from "@/modules/sales/constants";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  SalesEmptyState,
} from "@/modules/sales/components";

export default function Customers() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCustomers.filter(
      (c) =>
        !q ||
        c.companyName.toLowerCase().includes(q) ||
        c.contactPerson.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Customer management"
        description="Central customer database — profiles, proposals, invoices, and payments."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customers" },
        ]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add customer
          </Button>
        }
      />

      <SalesFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search customers…" />

      {filtered.length === 0 ? (
        <SalesEmptyState icon={Building2} title="No customers found" description="Try a different search term." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Company</TableHead>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">Phone</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs text-right">Total sales</TableHead>
                <TableHead className="text-xs text-right">Outstanding</TableHead>
                <TableHead className="text-xs">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Link href={`/sales/customers/${c.id}`} className="block min-w-0 hover:text-primary">
                      <p className="text-xs font-medium">{c.companyName}</p>
                      <p className="text-[10px] text-muted-foreground">{c.email}</p>
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{c.contactPerson}</TableCell>
                  <TableCell className="text-xs">{c.phone}</TableCell>
                  <TableCell className="text-xs">{c.location}</TableCell>
                  <TableCell className="text-xs capitalize">{c.type}</TableCell>
                  <TableCell>
                    <SalesStatusBadge variant="customer" value={c.status} />
                  </TableCell>
                  <TableCell className="text-xs text-right font-medium tabular-nums">{formatCurrency(c.totalSales)}</TableCell>
                  <TableCell className={`text-xs text-right tabular-nums ${c.outstanding > 0 ? "text-destructive font-medium" : ""}`}>
                    {formatCurrency(c.outstanding)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
