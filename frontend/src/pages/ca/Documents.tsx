import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FolderOpen } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { mockCaDocuments } from "@/modules/ca/mock-data";
import { DOCUMENT_CATEGORY_LABELS } from "@/modules/ca/constants";
import type { CaDocument } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

export default function Documents() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaDocuments.filter(
      (d) =>
        !q ||
        d.title.toLowerCase().includes(q) ||
        DOCUMENT_CATEGORY_LABELS[d.category].toLowerCase().includes(q),
    );
  }, [search]);

  const columns = useMemo<CmsColumn<CaDocument>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        cell: (d) => <span className="font-medium">{d.title}</span>,
      },
      {
        id: "category",
        header: "Category",
        chip: true,
        cell: (d) => (
          <CmsStatusChip label={DOCUMENT_CATEGORY_LABELS[d.category]} tone="neutral" />
        ),
      },
      {
        id: "version",
        header: "Version",
        cell: (d) => <span className="font-mono">{d.version}</span>,
      },
      {
        id: "uploaded",
        header: "Uploaded",
        cell: (d) => (
          <span className="text-muted-foreground">
            {format(new Date(d.uploadedAt), "MMM d, yyyy")}
          </span>
        ),
      },
      { id: "by", header: "By", cell: (d) => d.uploadedBy },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Document management"
        description="GST certificate, PAN, MOA, AOA, audit reports — version control"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Documents" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search documents…" />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(d) => d.id}
        empty={{ icon: FolderOpen, title: "No documents found" }}
      />
    </PortalPageShell>
  );
}
