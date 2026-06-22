import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockComplianceCalendar } from "@/modules/ca/mock-data";
import { CAPageHeader, CAFilterBar, CAEmptyState, ComplianceStatusBadge } from "@/modules/ca/components";

export default function ComplianceCalendar() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockComplianceCalendar.filter((c) => {
      const matchesSearch = !q || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
      const matchesTab = tab === "all" || c.status === tab;
      return matchesSearch && matchesTab;
    });
  }, [search, tab]);

  return (
    <PortalPageShell>
      <CAPageHeader
        title="Compliance calendar"
        description="GST, TDS, ROC, ITR, and audit due dates"
        breadcrumbs={[{ label: "CA", href: "/ca" }, { label: "Compliance calendar" }]}
      />
      <CAFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search compliance items…" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/10">All</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs data-[state=active]:bg-primary/10">Completed</TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs data-[state=active]:bg-primary/10">Upcoming</TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs data-[state=active]:bg-primary/10">Overdue</TabsTrigger>
        </TabsList>
      </Tabs>
      {filtered.length === 0 ? (
        <CAEmptyState icon={CalendarDays} title="No calendar items found" />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Due date</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs font-medium">{c.title}</TableCell>
                  <TableCell className="text-xs">{c.category}</TableCell>
                  <TableCell className="text-xs">{format(new Date(c.dueDate), "MMM d, yyyy")}</TableCell>
                  <TableCell><ComplianceStatusBadge status={c.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalPageShell>
  );
}
