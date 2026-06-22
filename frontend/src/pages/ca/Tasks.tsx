import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockCaTasks } from "@/modules/ca/mock-data";
import { TASK_STATUS_LABELS } from "@/modules/ca/constants";
import type { CaTaskStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CAEmptyState } from "@/modules/ca/components";

const statusStyles: Record<CaTaskStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  in_progress: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
};

const priorityStyles = {
  low: "bg-slate-500/10 text-slate-600",
  medium: "bg-amber-500/10 text-amber-700",
  high: "bg-red-500/10 text-red-600",
};

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaTasks.filter((t) => {
      const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.assignedTo.toLowerCase().includes(q);
      const matchesTab = tab === "all" || t.status === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="CA task management"
        description="CEO → CA → Accountant assignment chain"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Tasks" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search tasks, assignees…" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">All</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs data-[state=active]:bg-primary/10">Pending</TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs data-[state=active]:bg-primary/10">In progress</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs data-[state=active]:bg-primary/10">Completed</TabsTrigger>
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <CAEmptyState icon={ListTodo} title="No tasks found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Task</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">From</TableHead>
                <TableHead className="text-xs">To</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium max-w-[220px]">{t.title}</TableCell>
                  <TableCell className="text-xs">{t.category}</TableCell>
                  <TableCell className="text-xs">{t.assignedBy}</TableCell>
                  <TableCell className="text-xs">{t.assignedTo}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-[10px] capitalize ${priorityStyles[t.priority]}`}>{t.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[t.status]}`}>
                      {TASK_STATUS_LABELS[t.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(t.dueDate), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
