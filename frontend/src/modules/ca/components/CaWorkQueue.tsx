import { useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { ListChecks, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CmsChipTabs, CmsDataTable, CmsStatusChip, type CmsColumn } from "@/components/cms";
import { ChartPanel, ChartGridCell } from "@/components/dashboard/admin-dashboard-charts";
import type { CaWorkQueueItem, CaWorkQueueUrgency, CaWorkQueueDto } from "@/api/ca";
import { CaRefLink } from "./CaRefLink";

const URGENCY_LABELS: Record<CaWorkQueueUrgency, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  blocked: "Blocked",
  open: "Open",
};

const urgencyTone: Record<CaWorkQueueUrgency, "danger" | "warning" | "accent" | "neutral"> = {
  overdue: "danger",
  due_soon: "warning",
  blocked: "accent",
  open: "neutral",
};

const KIND_LABELS: Record<string, string> = {
  calendar: "Calendar",
  gst: "GST",
  tds: "TDS",
  roc: "ROC",
  notice: "Notice",
  task: "Task",
  dsc: "DSC",
  suspense: "Suspense",
  bank: "Bank",
};

function formatDue(dueDate: string | null) {
  if (!dueDate) return "—";
  const d = parseISO(dueDate);
  if (!isValid(d)) return dueDate;
  return format(d, "MMM d, yyyy");
}

export function CaWorkQueue({
  queue,
  isLoading,
}: {
  queue?: CaWorkQueueDto | null;
  isLoading?: boolean;
}) {
  const [tab, setTab] = useState<string>("all");
  const items = queue?.items ?? [];
  const counts = queue?.counts ?? { overdue: 0, dueSoon: 0, blocked: 0, open: 0, total: 0 };

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    if (tab === "due_soon") return items.filter((i) => i.urgency === "due_soon");
    if (tab === "blocked") return items.filter((i) => i.urgency === "blocked");
    if (tab === "overdue") return items.filter((i) => i.urgency === "overdue");
    if (tab === "open") return items.filter((i) => i.urgency === "open");
    return items;
  }, [items, tab]);

  const columns = useMemo<CmsColumn<CaWorkQueueItem>[]>(
    () => [
      {
        id: "urgency",
        header: "Urgency",
        chip: true,
        cell: (row) => (
          <CmsStatusChip label={URGENCY_LABELS[row.urgency]} tone={urgencyTone[row.urgency]} />
        ),
      },
      {
        id: "kind",
        header: "Type",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">{KIND_LABELS[row.kind] ?? row.kind}</span>
        ),
      },
      {
        id: "title",
        header: "Work item",
        cell: (row) => (
          <div className="min-w-0">
            <CaRefLink href={row.href} className="max-w-[280px] truncate block">
              {row.title}
            </CaRefLink>
            {row.subtitle ? (
              <p className="text-[10px] text-muted-foreground truncate max-w-[280px]">{row.subtitle}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "due",
        header: "Due",
        cell: (row) => (
          <span
            className={
              row.urgency === "overdue"
                ? "text-red-600 font-medium tabular-nums"
                : "text-muted-foreground tabular-nums"
            }
          >
            {formatDue(row.dueDate)}
          </span>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        cell: (row) => <span className="text-muted-foreground">{row.owner || "—"}</span>,
      },
    ],
    [],
  );

  return (
    <ChartPanel
      title="My work queue"
      description="What needs action this week — overdue, due soon, and blocked items"
      icon={ListChecks}
      accent="amber"
    >
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All", count: counts.total },
          { value: "overdue", label: "Overdue", count: counts.overdue },
          { value: "due_soon", label: "Due soon", count: counts.dueSoon },
          { value: "blocked", label: "Blocked", count: counts.blocked },
          { value: "open", label: "Open", count: counts.open },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        embedded
        onRowClick={(row) => {
          window.location.href = row.href;
        }}
        empty={{
          icon: ListChecks,
          title: tab === "all" ? "Queue is clear" : "Nothing in this filter",
          description:
            tab === "all"
              ? "No overdue, due-soon, or blocked compliance items right now."
              : "Try another urgency filter.",
        }}
      />
      <ChartGridCell className="pt-3 flex flex-wrap gap-2">
        <Link href="/ca/compliance-calendar">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            Calendar <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
        <Link href="/ca/tasks">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            Tasks <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
        <Link href="/ca/suspense">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            Suspense <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
        <Link href="/ca/bank-reconciliation">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            Bank recon <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </ChartGridCell>
    </ChartPanel>
  );
}
