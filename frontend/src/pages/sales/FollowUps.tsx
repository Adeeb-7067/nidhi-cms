import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { AlertTriangle, Calendar, List, Phone, Mail, Video } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { mockFollowUps } from "@/modules/sales/mock-data";
import {
  SalesPageHeader,
  SalesFilterBar,
  SalesStatusBadge,
  ExecutiveAvatar,
  SalesEmptyState,
} from "@/modules/sales/components";
import type { FollowUp } from "@/modules/sales/types";

const typeIcons = {
  call: Phone,
  email: Mail,
  meeting: Video,
  demo: Video,
};

function FollowUpCard({ fu }: { fu: FollowUp }) {
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
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{fu.leadName}</p>
              <p className="text-xs text-muted-foreground truncate">{fu.company}</p>
            </div>
            <SalesStatusBadge variant="followUp" value={fu.status} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{fu.notes}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Icon className="h-3 w-3" />
              <span className="capitalize">{fu.type}</span>
              <span>·</span>
              <span>{format(new Date(fu.scheduledAt), "MMM d, h:mm a")}</span>
            </div>
            <ExecutiveAvatar name={fu.executive.name} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function FollowUps() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("list");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockFollowUps.filter(
      (f) =>
        !q ||
        f.leadName.toLowerCase().includes(q) ||
        f.company.toLowerCase().includes(q) ||
        f.notes.toLowerCase().includes(q),
    );
  }, [search]);

  const overdue = filtered.filter((f) => f.status === "overdue");
  const scheduled = filtered.filter((f) => f.status === "scheduled");
  const completed = filtered.filter((f) => f.status === "completed");

  const monthStart = startOfMonth(new Date(2026, 4, 1));
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const followUpsByDay = useMemo(() => {
    const map = new Map<string, FollowUp[]>();
    for (const fu of mockFollowUps) {
      const key = format(new Date(fu.scheduledAt), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(fu);
      map.set(key, list);
    }
    return map;
  }, []);

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
            <p className="text-sm font-semibold mb-3">May 2026 — calendar</p>
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
                      isSameDay(day, new Date(2026, 4, 24)) && "border-primary bg-primary/5",
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
    </PortalPageShell>
  );
}
