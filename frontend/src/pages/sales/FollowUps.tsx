import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { AlertTriangle, Calendar, List, Phone, Mail, Video } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { useListFollowUps, type FollowUp as ApiFollowUp } from "@/api/sales";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  SalesEmptyState,
} from "@/modules/sales/components";

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Video,
  demo: Video,
};

function FollowUpCard({ fu }: { fu: ApiFollowUp }) {
  const Icon = typeIcons[fu.type] ?? Phone;
  return (
    <Link href={`/sales/leads/${fu.leadId}`}>
      <Card
        className={cn(
          "transition-colors hover:border-primary/30 hover:bg-muted/20",
          fu.status === "overdue" && "border-destructive/40 bg-destructive/[0.04]",
        )}
      >
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">Lead #{fu.leadId}</p>
            <SalesStatusBadge variant="followUp" value={fu.status} />
          </div>
          {fu.notes && (
            <p className="text-xs text-muted-foreground line-clamp-2">{fu.notes}</p>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1">
            <Icon className="h-3 w-3" />
            <span className="capitalize">{fu.type}</span>
            <span>·</span>
            <span>{format(new Date(fu.scheduledAt), "MMM d, h:mm a")}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function FollowUps() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");

  const { data, isLoading, isError, refetch } = useListFollowUps({ limit: 500 });
  const allFollowUps = data?.followUps ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allFollowUps;
    return allFollowUps.filter(
      (f) =>
        (f.notes?.toLowerCase().includes(q) ?? false) ||
        String(f.leadId).includes(q) ||
        f.type.toLowerCase().includes(q),
    );
  }, [allFollowUps, search]);

  const overdue = filtered.filter((f) => f.status === "overdue");
  const scheduled = filtered.filter((f) => f.status === "scheduled");
  const completed = filtered.filter((f) => f.status === "completed");

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const followUpsByDay = useMemo(() => {
    const map = new Map<string, ApiFollowUp[]>();
    for (const fu of allFollowUps) {
      const key = format(new Date(fu.scheduledAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(fu);
      map.set(key, list);
    }
    return map;
  }, [allFollowUps]);

  return (
    <PortalPageShell>
      <SalesPageHeader
        title="Follow-ups & activities"
        description="Global follow-up calendar and activity logs — ensure no lead is missed."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Follow-ups" },
        ]}
      />

      <SalesFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search follow-ups…"
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : isError ? (
        <SalesEmptyState
          title="Failed to load follow-ups"
          description="Could not fetch follow-ups from the server."
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      ) : (
        <>
      {overdue.length > 0 && (
        <motion.section
          className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 space-y-3"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Overdue ({overdue.length})</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {overdue.map((fu) => (
              <FollowUpCard key={fu.id} fu={fu} />
            ))}
          </div>
        </motion.section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">{format(monthStart, "MMMM yyyy")} — calendar</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayFollowUps = followUpsByDay.get(key) ?? [];
                const hasOverdue = dayFollowUps.some((f) => f.status === "overdue");
                return (
                  <div
                    key={key}
                    className={cn(
                      "aspect-square rounded-md border p-0.5 text-[10px] flex flex-col items-center justify-start",
                      isSameDay(day, new Date()) && "border-primary bg-primary/5",
                      dayFollowUps.length > 0 && "bg-muted/40",
                      hasOverdue && "border-destructive/40 bg-destructive/[0.06]",
                    )}
                  >
                    <span className="font-medium">{format(day, "d")}</span>
                    {dayFollowUps.length > 0 && (
                      <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", hasOverdue ? "bg-destructive" : "bg-primary")} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="h-9">
              <TabsTrigger value="list" className="text-xs gap-1.5">
                <List className="h-3.5 w-3.5" />
                Activity list
              </TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs gap-1.5 lg:hidden">
                <Calendar className="h-3.5 w-3.5" />
                Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4 space-y-6">
          {filtered.length === 0 ? (
            <SalesEmptyState
              title="No follow-ups"
              description="No follow-ups match your search."
            />
          ) : (
            <>
              {scheduled.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Scheduled
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {scheduled.map((fu) => (
                      <FollowUpCard key={fu.id} fu={fu} />
                    ))}
                  </div>
                </section>
              )}
              {completed.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Completed
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {completed.map((fu) => (
                      <FollowUpCard key={fu.id} fu={fu} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </TabsContent>

            <TabsContent value="calendar" className="mt-4 lg:hidden">
              <Card>
                <CardContent className="p-4 text-sm text-muted-foreground">Use desktop split view for full calendar.</CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
        </>
      )}
    </PortalPageShell>
  );
}
