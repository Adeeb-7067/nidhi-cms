import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Image, ExternalLink } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { mockGraphicRequests } from "@/modules/marketing/mock-data";
import { GRAPHIC_FILE_LABELS } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  ApprovalStatusBadge,
} from "@/modules/marketing/components";

export default function MarketingGraphics() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockGraphicRequests.filter(
      (g) =>
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.clientName.toLowerCase().includes(q) ||
        g.assignee.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Graphics queue"
        description="Design requests, revisions, brand guidelines, and deliverable files"
        breadcrumbs={[{ label: "Marketing", href: "/marketing" }, { label: "Graphics" }]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search designs, clients…" />

      {filtered.length === 0 ? (
        <MarketingEmptyState icon={Image} title="No graphic requests" description="The queue is empty for current filters." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Design</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Revisions</TableHead>
                <TableHead className="text-xs">Files</TableHead>
                <TableHead className="text-xs">Brand guide</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="text-xs font-medium max-w-[180px] truncate">{g.title}</TableCell>
                  <TableCell className="text-xs">{g.clientName}</TableCell>
                  <TableCell><ApprovalStatusBadge stage={g.status} /></TableCell>
                  <TableCell className="text-xs text-center">{g.revisionCount}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {g.fileTypes.map((f) => (
                        <Badge key={f} variant="outline" className="text-[9px] px-1.5 py-0">
                          {GRAPHIC_FILE_LABELS[f]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <a
                      href={g.brandGuidelineUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="text-xs">{g.assignee}</TableCell>
                  <TableCell className="text-xs">{format(new Date(g.dueDate), "MMM d")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
