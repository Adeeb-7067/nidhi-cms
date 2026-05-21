import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  useListProjects,
  useListMyLogs,
  useListBugs,
  useListTickets,
  useListNotifications,
  getListMyLogsQueryKey,
} from "@/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Clock,
  Bug,
  Smartphone,
  FileText,
  Ticket,
  MessageSquare,
  Bell,
  FlaskConical,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DashboardHero,
  ExecutiveStatCard,
  PanelCard,
  PageKpiRow,
  QuickAction,
} from "@/components/dashboard/dashboard-kit";
import { cn } from "@/lib/utils";
import { getProjectDetailHref } from "@/lib/project-routes";
import { formatDistanceToNow } from "date-fns";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const ROLE_LABELS: Record<string, string> = {
  developer: "Developer",
  tester: "QA / Tester",
  super_admin: "Super Admin",
};

export default function DevWorkspace() {
  const { user } = useAuth();
  const role = user?.role ?? "developer";
  const isTester = role === "tester";
  const isDeveloper = role === "developer";
  const canReportBugs = isTester || role === "super_admin";

  const [activeTab, setActiveTab] = useState<"development" | "maintenance">("development");

  const { data: projectsData, isLoading: projectsLoading } = useListProjects({
    status: activeTab === "maintenance" ? "maintenance" : "!maintenance",
    limit: 50,
  });

  const projectsByCompany = useMemo(() => {
    const map = new Map<string, NonNullable<typeof projectsData>["projects"]>();
    for (const p of projectsData?.projects ?? []) {
      const label = p.companyName ?? p.clientName ?? "Company";
      const list = map.get(label) ?? [];
      list.push(p);
      map.set(label, list);
    }
    return [...map.entries()];
  }, [projectsData?.projects]);

  const { data: logsData, isLoading: logsLoading } = useListMyLogs(
    { limit: 5 },
    {
      query: {
        enabled: isDeveloper || role === "super_admin",
        queryKey: getListMyLogsQueryKey({ limit: 5 }),
      },
    },
  );

  const { data: bugsData, isLoading: bugsLoading } = useListBugs({ status: "open", limit: 5 });
  const { data: ticketsData, isLoading: ticketsLoading } = useListTickets({ status: "open", limit: 5 });
  const { data: projectsTotal } = useListProjects({ limit: 1 });
  const { data: bugsTotal } = useListBugs({ status: "open", limit: 1 });
  const { data: ticketsTotal } = useListTickets({ status: "open", limit: 1 });
  const { data: notifData } = useListNotifications({ unreadOnly: true, limit: 1 });

  if (!user) return null;

  const quickActions = isTester
    ? [
        { title: "My projects", description: "Ongoing assignments and deadlines", icon: Briefcase, href: "/dev/projects", accent: "sky" as const },
        { title: "Report bug", description: "Log a new defect with steps and attachments", icon: Bug, href: "/dev/bugs", accent: "red" as const },
        { title: "Bug tracker", description: "Review open and in-progress issues", icon: FlaskConical, href: "/dev/bugs", accent: "amber" as const },
        { title: "Tickets", description: "Support and client requests", icon: Ticket, href: "/admin/tickets", accent: "violet" as const },
        { title: "Discussions", description: "Project threads and updates", icon: MessageSquare, href: "/admin/discussions", accent: "sky" as const },
      ]
    : [
        { title: "My projects", description: "Ongoing assignments and deadlines", icon: Briefcase, href: "/dev/projects", accent: "sky" as const },
        { title: "Log today", description: "Record hours and tasks for your projects", icon: Clock, href: "/dev/logs", accent: "primary" as const },
        { title: "Upload release", description: "Ship a new APK build to clients", icon: Smartphone, href: "/dev/apk", accent: "green" as const },
        { title: canReportBugs ? "Report bug" : "Bug tracker", description: canReportBugs ? "File a new issue" : "Update status and assignees", icon: Bug, href: "/dev/bugs", accent: "red" as const },
        { title: "Resource request", description: "Request tools, access, or assets", icon: FileText, href: "/dev/requests", accent: "amber" as const },
      ];

  return (
    <motion.div className="space-y-6 pb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <DashboardHero
        title={`${getGreeting()}, ${user.name.split(" ")[0]}`}
        subtitle={
          isTester
            ? "Track quality across projects, report bugs, and stay on top of tickets."
            : "Your delivery hub — projects, logs, releases, and bugs in one place."
        }
        badge={ROLE_LABELS[role] ?? role}
        actions={
          role === "super_admin" ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Admin dashboard
              </Link>
            </Button>
          ) : undefined
        }
      />

      <PageKpiRow>
        <ExecutiveStatCard title="My Projects" value={projectsTotal?.total ?? 0} hint="Assigned to you" icon={Briefcase} href="/dev/projects" accent="blue" delay={0} />
        <ExecutiveStatCard title="Open Bugs" value={bugsTotal?.total ?? 0} hint="Needs attention" icon={Bug} href="/dev/bugs" accent="red" alert={(bugsTotal?.total ?? 0) > 0} delay={1} />
        <ExecutiveStatCard title="Open Tickets" value={ticketsTotal?.total ?? 0} hint="Support queue" icon={Ticket} href="/admin/tickets" accent="violet" delay={2} />
        <ExecutiveStatCard title="Notifications" value={notifData?.unreadCount ?? notifData?.total ?? 0} hint="Unread" icon={Bell} href="/notifications" accent="sky" alert={(notifData?.unreadCount ?? 0) > 0} delay={3} />
      </PageKpiRow>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Quick actions</p>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, i) => (
            <QuickAction key={`${action.href}-${action.title}`} {...action} delay={i} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <PanelCard
            title={isTester ? "Projects under test" : "My projects"}
            description={isTester ? "Active builds and environments you're covering" : "Projects you are actively assigned to"}
            viewAllHref="/dev/projects"
          >
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "development" | "maintenance")} className="mb-4">
                <TabsList className="grid w-full max-w-xs grid-cols-2 h-9">
                  <TabsTrigger value="development" className="text-xs font-medium">Active dev</TabsTrigger>
                  <TabsTrigger value="maintenance" className="text-xs font-medium">Maintenance</TabsTrigger>
                </TabsList>
              </Tabs>

              <motion.div className="space-y-3">
                {projectsLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)
                ) : !projectsData?.projects.length ? (
                  <div className="rounded-xl border border-dashed border-border py-12 text-center">
                    <Briefcase className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No projects in this view</p>
                  </div>
                ) : (
                  projectsByCompany.map(([companyName, companyProjects], groupIdx) => (
                    <div key={companyName} className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        {companyName}
                      </p>
                      {companyProjects.map((project, i) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (groupIdx * 3 + i) * 0.05 }}
                    >
                      <Link href={getProjectDetailHref(project.id)}>
                        <div className="group rounded-xl border border-border/60 p-4 transition-all hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{project.name}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{companyName}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-[10px] capitalize">
                              {project.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <div className="mt-3 space-y-1.5">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>Progress</span>
                              <span className="font-medium text-foreground">{project.completionPct}%</span>
                            </div>
                            <Progress value={project.completionPct} className="h-1.5" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                      ))}
                    </div>
                  ))
                )}
              </motion.div>
          </PanelCard>
        </div>

        <div className="lg:col-span-4 space-y-6">
          {(isDeveloper || role === "super_admin") && (
            <PanelCard title="Recent logs" description="Latest daily entries" viewAllHref="/dev/logs">
              <div className="space-y-2">
                {logsLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
                ) : !logsData?.logs.length ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No logs yet today</p>
                ) : (
                  logsData.logs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-border/40 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                      <div className="flex justify-between gap-2">
                        <p className="text-xs font-medium line-clamp-1">{log.taskTitle}</p>
                        <span className="text-xs font-bold text-primary shrink-0">{log.hoursSpent}h</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{log.projectName}</p>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>
          )}

          <PanelCard
            title="Open bugs"
            description={isTester ? "Recently reported issues" : "Assigned and open"}
            viewAllHref="/dev/bugs"
          >
            <motion.div className="space-y-2">
              {bugsLoading ? (
                [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
              ) : !bugsData?.bugs.length ? (
                <p className="text-xs text-muted-foreground text-center py-6">No open bugs</p>
              ) : (
                bugsData.bugs.map((bug) => (
                  <Link key={bug.id} href="/dev/bugs">
                    <div className="rounded-lg border border-border/40 px-3 py-2.5 hover:bg-muted/40 transition-colors mb-2 block">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium line-clamp-1">{bug.title}</p>
                        <Badge variant="outline" className={cn("text-[9px] shrink-0 capitalize", bug.severity === "critical" && "border-red-500/50 text-red-500", bug.severity === "high" && "border-orange-500/50 text-orange-500")}>
                          {bug.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{bug.bugNumber} · {bug.projectName}</p>
                    </div>
                  </Link>
                ))
              )}
            </motion.div>
          </PanelCard>

          <PanelCard title="Open tickets" viewAllHref="/admin/tickets">
            <div className="space-y-2">
              {ticketsLoading ? (
                [...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
              ) : !ticketsData?.tickets?.length ? (
                <p className="text-xs text-muted-foreground text-center py-6">No open tickets</p>
              ) : (
                ticketsData.tickets.map((ticket) => (
                  <Link key={ticket.id} href="/admin/tickets">
                    <div className="rounded-lg border border-border/40 px-3 py-2.5 hover:bg-muted/40 transition-colors mb-2 block">
                      <p className="text-xs font-medium line-clamp-1">{ticket.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </PanelCard>
        </div>
      </div>
    </motion.div>
  );
}
