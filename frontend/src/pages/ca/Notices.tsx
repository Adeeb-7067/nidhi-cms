import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Mail } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { mockCaNotices } from "@/modules/ca/mock-data";
import { NOTICE_DEPARTMENT_LABELS, NOTICE_WORKFLOW_LABELS } from "@/modules/ca/constants";
import type { CaNotice, NoticeWorkflowStatus } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar } from "@/modules/ca/components";

const workflowOrder: NoticeWorkflowStatus[] = ["received", "assigned", "replied", "closed"];

const workflowTone: Record<NoticeWorkflowStatus, "info" | "warning" | "accent" | "success"> = {
  received: "info",
  assigned: "warning",
  replied: "accent",
  closed: "success",
};

export default function Notices() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockCaNotices.filter((n) => {
      const matchesSearch =
        !q || n.reference.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q);
      const matchesTab = tab === "all" || n.workflowStatus === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: mockCaNotices.length };
    for (const s of workflowOrder) {
      base[s] = mockCaNotices.filter((n) => n.workflowStatus === s).length;
    }
    return base;
  }, []);

  const columns = useMemo<CmsColumn<CaNotice>[]>(
    () => [
      {
        id: "department",
        header: "Department",
        cell: (n) => <span className="font-medium">{NOTICE_DEPARTMENT_LABELS[n.department]}</span>,
      },
      {
        id: "reference",
        header: "Reference",
        cell: (n) => <span className="font-mono">{n.reference}</span>,
      },
      {
        id: "subject",
        header: "Subject",
        cell: (n) => <span className="max-w-[200px] block truncate">{n.subject}</span>,
      },
      {
        id: "received",
        header: "Received",
        cell: (n) => (
          <span className="text-muted-foreground">{format(new Date(n.receivedAt), "MMM d, yyyy")}</span>
        ),
      },
      {
        id: "due",
        header: "Due",
        cell: (n) => format(new Date(n.dueDate), "MMM d, yyyy"),
      },
      {
        id: "workflow",
        header: "Workflow",
        chip: true,
        cell: (n) => (
          <CmsStatusChip
            label={NOTICE_WORKFLOW_LABELS[n.workflowStatus]}
            tone={workflowTone[n.workflowStatus]}
          />
        ),
      },
      { id: "assigned", header: "Assigned to", cell: (n) => n.assignedTo },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Notice management"
        description="GST, Income Tax, MCA, PF, ESIC — received → assigned → replied → closed"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Notices" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search notices…" />
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All", count: counts.all },
          ...workflowOrder.map((s) => ({
            value: s,
            label: NOTICE_WORKFLOW_LABELS[s],
            count: counts[s] ?? 0,
          })),
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(n) => n.id}
        empty={{ icon: Mail, title: "No notices found" }}
      />
    </PortalPageShell>
  );
}
