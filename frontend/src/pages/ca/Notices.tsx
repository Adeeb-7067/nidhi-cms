import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Mail } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockCaNotices } from "@/modules/ca/mock-data";
import { NOTICE_DEPARTMENT_LABELS, NOTICE_WORKFLOW_LABELS } from "@/modules/ca/constants";
import type { NoticeWorkflowStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, CAEmptyState } from "@/modules/ca/components";

const workflowOrder: NoticeWorkflowStatus[] = ["received", "assigned", "replied", "closed"];

const workflowStyles: Record<NoticeWorkflowStatus, string> = {
  received: "bg-blue-500/10 text-blue-700 border-blue-500/25",
  assigned: "bg-amber-500/10 text-amber-700 border-amber-500/25",
  replied: "bg-violet-500/10 text-violet-700 border-violet-500/25",
  closed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",
};

export default function Notices() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaNotices.filter((n) => {
      const matchesSearch = !q || n.reference.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q);
      const matchesTab = tab === "all" || n.workflowStatus === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Notice management"
        description="GST, Income Tax, MCA, PF, ESIC — received → assigned → replied → closed"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Notices" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search notices…" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">All</TabsTrigger>
          {workflowOrder.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs data-[state=active]:bg-primary/10 capitalize">
              {NOTICE_WORKFLOW_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <CAEmptyState icon={Mail} title="No notices found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Department</TableHead>
                <TableHead className="text-xs">Reference</TableHead>
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="text-xs">Received</TableHead>
                <TableHead className="text-xs">Due</TableHead>
                <TableHead className="text-xs">Workflow</TableHead>
                <TableHead className="text-xs">Assigned to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((n) => (
                <TableRow key={n.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{NOTICE_DEPARTMENT_LABELS[n.department]}</TableCell>
                  <TableCell className="text-xs font-mono">{n.reference}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">{n.subject}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(n.receivedAt), "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-xs">{format(new Date(n.dueDate), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${workflowStyles[n.workflowStatus]}`}>
                      {NOTICE_WORKFLOW_LABELS[n.workflowStatus]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{n.assignedTo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
