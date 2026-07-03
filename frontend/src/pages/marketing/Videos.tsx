import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Video, Check, X } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockVideoRequests } from "@/modules/marketing/mock-data";
import { VIDEO_EXPORT_LABELS } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  MarketingStatusBadge,
} from "@/modules/marketing/components";
import { cn } from "@/lib/utils";

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-3.5 w-3.5 text-emerald-600" />
  ) : (
    <X className="h-3.5 w-3.5 text-muted-foreground" />
  );
}

export default function MarketingVideos() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockVideoRequests.filter(
      (v) =>
        !q ||
        v.title.toLowerCase().includes(q) ||
        v.clientName.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Video & reel queue"
        description="Raw files, voiceover, subtitles, thumbnails, and export targets"
        breadcrumbs={[{ label: "Marketing", href: "/marketing" }, { label: "Videos" }]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search videos, clients…" />

      {filtered.length === 0 ? (
        <MarketingEmptyState icon={Video} title="No video requests" description="The queue is empty for current filters." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Render status</TableHead>
                <TableHead className="text-xs text-center">VO</TableHead>
                <TableHead className="text-xs text-center">Subs</TableHead>
                <TableHead className="text-xs text-center">Thumb</TableHead>
                <TableHead className="text-xs">Export</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs font-medium max-w-[180px] truncate">{v.title}</TableCell>
                  <TableCell className="text-xs">{v.clientName}</TableCell>
                  <TableCell><MarketingStatusBadge variant="videoRender" status={v.renderStatus} /></TableCell>
                  <TableCell className={cn("text-center")}><BoolIcon value={v.hasVoiceover} /></TableCell>
                  <TableCell className="text-center"><BoolIcon value={v.hasSubtitles} /></TableCell>
                  <TableCell className="text-center"><BoolIcon value={v.hasThumbnail} /></TableCell>
                  <TableCell className="text-xs">{VIDEO_EXPORT_LABELS[v.exportTarget]}</TableCell>
                  <TableCell className="text-xs">{v.assignee}</TableCell>
                  <TableCell className="text-xs">{format(new Date(v.dueDate), "MMM d")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
