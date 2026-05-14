import React from "react";
import { useListProjects, useListMyLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Briefcase, Clock, Plus, Bug, Smartphone, FileText } from "lucide-react";
import { Link } from "wouter";

export default function DevWorkspace() {
  const { data: projectsData, isLoading: projectsLoading } = useListProjects({ limit: 5 });
  const { data: logsData, isLoading: logsLoading } = useListMyLogs({ limit: 5 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My Workspace</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Your projects, logs, and daily operations</p>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Link href="/dev/logs">
          <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer card-hover">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="font-semibold text-xs">Log Today</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Track your work</p>
          </div>
        </Link>
        <Link href="/dev/apk">
          <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer card-hover">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
              <Smartphone className="h-5 w-5 text-green-500" />
            </div>
            <p className="font-semibold text-xs">Upload Release</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Push new APK</p>
          </div>
        </Link>
        <Link href="/dev/bugs">
          <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer card-hover">
            <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center mb-4 group-hover:bg-red-500/20 transition-colors">
              <Bug className="h-5 w-5 text-red-500" />
            </div>
            <p className="font-semibold text-xs">Report Bug</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">File an issue</p>
          </div>
        </Link>
        <Link href="/dev/requests">
          <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer card-hover">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 group-hover:bg-amber-500/20 transition-colors">
              <FileText className="h-5 w-5 text-amber-500" />
            </div>
            <p className="font-semibold text-xs">Request Resource</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Team requests</p>
          </div>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">My Projects</CardTitle>
                <CardDescription className="text-xs">Projects you are actively assigned to</CardDescription>
              </div>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {projectsLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                ) : projectsData?.projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">No assigned projects</div>
                ) : (
                  projectsData?.projects.map(project => (
                    <div key={project.id} className="flex flex-col p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-xs">{project.name}</h4>
                          <p className="text-[10px] text-muted-foreground">{project.clientName}</p>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">{project.status.replace('_', ' ').toUpperCase()}</Badge>
                      </div>
                      <div className="w-full mt-3">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{project.completionPct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full progress-fill" style={{width: `${project.completionPct}%`}} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Logs</CardTitle>
              <CardDescription className="text-xs">Your latest daily entries</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {logsLoading ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : logsData?.logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">No recent logs</div>
                ) : (
                  logsData?.logs.map(log => (
                    <div key={log.id} className="group rounded-lg p-2 hover:bg-muted/40 transition-colors border border-transparent hover:border-border">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-xs line-clamp-1 flex-1">{log.taskTitle}</p>
                        <span className="text-[10px] font-bold text-primary shrink-0">{log.hoursSpent}h</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{log.projectName}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.logDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
                <Button variant="ghost" className="w-full text-[10px] h-8 text-primary mt-2" asChild>
                  <Link href="/dev/logs">View all logs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
