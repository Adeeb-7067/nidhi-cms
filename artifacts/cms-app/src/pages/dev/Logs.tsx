import React from "react";
import { useListMyLogs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DevLogs() {
  const { data, isLoading } = useListMyLogs({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Logs</h1>
          <p className="text-muted-foreground">Track your time and progress</p>
        </div>
        <Button className="bg-primary text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" /> Add Log Entry
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : data?.logs.length === 0 ? (
          <Card className="bg-card">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground">No logs found</h3>
              <p className="text-sm mt-1">You haven't logged any work yet.</p>
            </CardContent>
          </Card>
        ) : (
          data?.logs.map(log => (
            <Card key={log.id} className="bg-card hover:bg-muted/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(log.logDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      <span className="mx-2">•</span>
                      <span className="font-medium text-primary">{log.projectName}</span>
                    </div>
                    <h3 className="text-lg font-semibold">{log.taskTitle}</h3>
                    {log.taskDescription && <p className="text-sm text-muted-foreground max-w-3xl">{log.taskDescription}</p>}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {log.workCategories.map(cat => (
                        <Badge key={cat} variant="secondary">{cat.replace('_', ' ')}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-4 md:gap-2 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 shrink-0">
                    <div className="text-center md:text-right">
                      <div className="text-2xl font-bold text-foreground">{log.hoursSpent}<span className="text-base font-normal text-muted-foreground">h</span></div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Logged</div>
                    </div>
                    <div className="text-center md:text-right">
                      <div className="text-xl font-bold text-green-500">{log.completionPct}%</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">Complete</div>
                    </div>
                  </div>
                </div>
                {(log.blockers || log.nextDayPlan) && (
                  <div className="mt-4 pt-4 border-t border-border grid sm:grid-cols-2 gap-4">
                    {log.blockers && (
                      <div className="bg-destructive/5 rounded-md p-3 border border-destructive/20">
                        <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-1">Blockers</h4>
                        <p className="text-sm">{log.blockers}</p>
                      </div>
                    )}
                    {log.nextDayPlan && (
                      <div className="bg-primary/5 rounded-md p-3 border border-primary/20">
                        <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Next Day Plan</h4>
                        <p className="text-sm">{log.nextDayPlan}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
