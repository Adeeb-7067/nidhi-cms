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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Workspace</h1>
        <p className="text-muted-foreground">Your active projects and daily tasks</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-card hover:bg-muted" asChild>
          <Link href="/dev/logs">
            <Clock className="h-6 w-6 text-primary" />
            <span>Log Today's Work</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-card hover:bg-muted" asChild>
          <Link href="/dev/apk">
            <Smartphone className="h-6 w-6 text-green-500" />
            <span>Upload APK</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-card hover:bg-muted" asChild>
          <Link href="/dev/bugs">
            <Bug className="h-6 w-6 text-red-500" />
            <span>Report Bug</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 bg-card hover:bg-muted" asChild>
          <Link href="/dev/requests">
            <FileText className="h-6 w-6 text-amber-500" />
            <span>Request Resource</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>My Projects</CardTitle>
                <CardDescription>Projects you are actively assigned to</CardDescription>
              </div>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectsLoading ? (
                  [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
                ) : projectsData?.projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No assigned projects</div>
                ) : (
                  projectsData?.projects.map(project => (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <h4 className="font-semibold text-lg">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">{project.clientName}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">{project.status.replace('_', ' ').toUpperCase()}</Badge>
                        <div className="flex items-center text-sm font-medium">
                          <span className="text-muted-foreground mr-2">Progress:</span>
                          {project.completionPct}%
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
              <CardDescription>Your latest daily entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logsLoading ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                ) : logsData?.logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No recent logs</div>
                ) : (
                  logsData?.logs.map(log => (
                    <div key={log.id} className="border-l-2 border-primary pl-4 py-1">
                      <p className="font-medium text-sm line-clamp-1">{log.taskTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.projectName} • {log.hoursSpent}h • {new Date(log.logDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
                <Button variant="ghost" className="w-full text-xs text-primary mt-2" asChild>
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
