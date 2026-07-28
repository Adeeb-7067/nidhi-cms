import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { CmsChipTabs, CmsDataTable, type CmsColumn } from "@/components/cms";
import { mockComplianceCalendar } from "@/modules/ca/mock-data";
import type { ComplianceCalendarItem } from "@/modules/ca/types";
import { CAPageHeader, CAFilterBar, ComplianceStatusBadge } from "@/modules/ca/components";

export default function ComplianceCalendar() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockComplianceCalendar.filter((c) => {
      const matchesSearch =
        !q || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
      const matchesTab = tab === "all" || c.status === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab]);

  const counts = useMemo(() => {
    return {
      all: mockComplianceCalendar.length,
      completed: mockComplianceCalendar.filter((c) => c.status === "completed").length,
      upcoming: mockComplianceCalendar.filter((c) => c.status === "upcoming").length,
      overdue: mockComplianceCalendar.filter((c) => c.status === "overdue").length,
    };
  }, []);

  const columns = useMemo<CmsColumn<ComplianceCalendarItem>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        cell: (c) => <span className="font-medium">{c.title}</span>,
      },
      { id: "category", header: "Category", cell: (c) => c.category },
      {
        id: "due",
        header: "Due date",
        cell: (c) => format(new Date(c.dueDate), "MMM d, yyyy"),
      },
      {
        id: "status",
        header: "Status",
        chip: true,
        cell: (c) => <ComplianceStatusBadge status={c.status} />,
      },
    ],
    [],
  );

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Compliance calendar"
        description="GST, TDS, ROC, ITR, and audit due dates"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Compliance calendar" }]}
      />
      <CAFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search compliance items…"
      />
      <CmsChipTabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "all", label: "All", count: counts.all },
          { value: "completed", label: "Completed", count: counts.completed },
          { value: "upcoming", label: "Upcoming", count: counts.upcoming },
          { value: "overdue", label: "Overdue", count: counts.overdue },
        ]}
      />
      <CmsDataTable
        columns={columns}
        rows={filtered}
        rowKey={(c) => c.id}
        empty={{ icon: CalendarDays, title: "No calendar items found" }}
      />
    </PortalPageShell>
  );
}
