import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Plus, CheckSquare } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockMarketingTasks } from "@/modules/marketing/mock-data";
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, TASK_CATEGORY_LABELS } from "@/modules/marketing/constants";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  MarketingStatusBadge,
  MarketingEmptyState,
} from "@/modules/marketing/components";

export default function MarketingTasks() {
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState("all");

  const filtered = useMemo(() => {
    return mockMarketingTasks.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q);
      const matchesStatus = statusTab === "all" || t.status === statusTab;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: mockMarketingTasks.length };
    for (const s of TASK_STATUS_ORDER) {
      counts[s] = mockMarketingTasks.filter((t) => t.status === s).length;
    }
    return counts;
  }, []);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Daily tasks"
        description="Task management — status, priority, deadlines, and estimated hours"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Tasks" }]}
        actions={
          <Button size="sm" className="h-8 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
        }
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search tasks, clients, assignees…" />

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">
            All ({statusCounts.all})
          </TabsTrigger>
          {TASK_STATUS_ORDER.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs data-[state=active]:bg-primary/10">
              {TASK_STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <MarketingEmptyState icon={CheckSquare} title="No tasks found" description="Adjust filters or create a new task." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Task</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Client</TableHead>
                <TableHead className="text-xs">Assignee</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Deadline</TableHead>
                <TableHead className="text-xs text-right">Est. hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-xs font-medium max-w-[200px] truncate">{t.title}</TableCell>
                  <TableCell className="text-xs">{TASK_CATEGORY_LABELS[t.category]}</TableCell>
                  <TableCell className="text-xs">{t.clientName}</TableCell>
                  <TableCell className="text-xs">{t.assignee}</TableCell>
                  <TableCell><MarketingStatusBadge variant="task" status={t.status} /></TableCell>
                  <TableCell><MarketingStatusBadge variant="priority" status={t.priority} /></TableCell>
                  <TableCell className="text-xs">{format(new Date(t.deadline), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs text-right">{t.estimatedHours}h</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
