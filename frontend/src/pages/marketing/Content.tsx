import { useMemo, useState } from "react";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { mockContentItems } from "@/modules/marketing/mock-data";
import { CONTENT_TYPE_LABELS } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  ApprovalStatusBadge,
} from "@/modules/marketing/components";

export default function MarketingContent() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockContentItems.filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Content writer queue"
        description="Blogs, captions, scripts, and emails with approval status and SEO scores"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Content" }]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search content, clients…" />

      {filtered.length === 0 ? (
        <MarketingEmptyState icon={FileText} title="No content items" description="The queue is empty for current filters." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">SEO score</TableHead>
                <TableHead className="text-xs text-right">Words</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{c.title}</TableCell>
                  <TableCell className="text-xs">{CONTENT_TYPE_LABELS[c.type]}</TableCell>
                  <TableCell className="text-xs">{c.clientName}</TableCell>
                  <TableCell><ApprovalStatusBadge stage={c.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={c.seoScore} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground w-8">{c.seoScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-right">{c.wordCount}</TableCell>
                  <TableCell className="text-xs">{c.assignee}</TableCell>
                  <TableCell className="text-xs">{format(new Date(c.dueDate), "MMM d")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
