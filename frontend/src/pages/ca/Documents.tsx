import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockCaDocuments } from "@/modules/ca/mock-data";
import { DOCUMENT_CATEGORY_LABELS } from "@/modules/ca/constants";
import { CAPageHeader, CAFilterBar, CAEmptyState } from "@/modules/ca/components";

export default function Documents() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaDocuments.filter(
      (d) => !q || d.title.toLowerCase().includes(q) || DOCUMENT_CATEGORY_LABELS[d.category].toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Document management"
        description="GST certificate, PAN, MOA, AOA, audit reports — version control"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Documents" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search documents…" />
      {filtered.length === 0 ? (
        <CAEmptyState icon={FolderOpen} title="No documents found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Version</TableHead>
                <TableHead className="text-xs">Uploaded</TableHead>
                <TableHead className="text-xs">By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{d.title}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{DOCUMENT_CATEGORY_LABELS[d.category]}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{d.version}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(d.uploadedAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs">{d.uploadedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
