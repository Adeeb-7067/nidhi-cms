import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { mockCalendarPosts } from "@/modules/marketing/mock-data";
import { POST_SCHEDULE_STATUS_LABELS } from "@/modules/marketing/constants";
import type { PostScheduleStatus } from "@/modules/marketing/types";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingEmptyState,
  PlatformIconBadge,
  ApprovalStatusBadge,
  MarketingStatusBadge,
} from "@/modules/marketing/components";

const scheduleTabs: (PostScheduleStatus | "all")[] = ["all", "scheduled", "pending", "published", "rejected"];

export default function MarketingCalendar() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<string>("all");
  const [view, setView] = useState("month");

  const filtered = useMemo(() => {
    return mockCalendarPosts.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.caption.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || p.scheduleStatus === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusTab]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Content calendar"
        description="Scheduled posts — platform, caption, hashtags, and approval status"
        breadcrumbs={[{ label: "Marketing", href: "/marketing" }, { label: "Calendar" }]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search posts, clients…">
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="h-8">
            <TabsTrigger value="month" className="text-xs px-3">Month</TabsTrigger>
            <TabsTrigger value="week" className="text-xs px-3">Week</TabsTrigger>
            <TabsTrigger value="day" className="text-xs px-3">Day</TabsTrigger>
          </TabsList>
        </Tabs>
      </MarketingFilterBar>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          {scheduleTabs.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs data-[state=active]:bg-primary/10">
              {s === "all" ? "All" : POST_SCHEDULE_STATUS_LABELS[s]} (
              {s === "all" ? mockCalendarPosts.length : mockCalendarPosts.filter((p) => p.scheduleStatus === s).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <MarketingEmptyState icon={Calendar} title="No posts found" description="Adjust filters or schedule a new post." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Scheduled</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Platform</TableHead>
                <TableHead className="text-xs">Caption</TableHead>
                <TableHead className="text-xs">Hashtags</TableHead>
                <TableHead className="text-xs">Approval</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(p.scheduledAt), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell className="text-xs">{p.clientName}</TableCell>
                  <TableCell><PlatformIconBadge platform={p.platform} showLabel={false} /></TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{p.caption}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.hashtags.map((h) => (
                        <Badge key={h} variant="secondary" className="text-[9px] px-1 py-0">{h}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><ApprovalStatusBadge stage={p.approvalStage} /></TableCell>
                  <TableCell><MarketingStatusBadge variant="postSchedule" status={p.scheduleStatus} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
