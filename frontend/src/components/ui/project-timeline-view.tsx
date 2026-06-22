import React from "react";
import { Calendar, CheckCircle2, Hourglass, AlertCircle } from "lucide-react";
import { Badge } from "./badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface Milestone {
  id: number;
  title: string;
  description?: string | null;
  plannedDate?: string;
  targetDate?: string;
  status: "pending" | "completed" | "delayed";
  assigneeName?: string | null;
  assigneeAvatarUrl?: string | null;
  assigneeRole?: string | null;
}

function milestoneDate(m: Milestone) {
  return m.plannedDate ?? m.targetDate ?? new Date().toISOString();
}

interface ProjectTimelineProps {
  startDate: string;
  deadline: string;
  milestones: Milestone[];
}

export function ProjectTimelineView({ startDate, deadline, milestones = [] }: ProjectTimelineProps) {
  const start = new Date(startDate).getTime();
  const end = new Date(deadline).getTime();
  const now = new Date().getTime();
  
  const totalDuration = Math.max(end - start, 1); // Guard devide by zero
  
  const getPct = (dateStr: string) => {
    const ts = new Date(dateStr).getTime();
    const rawPct = ((ts - start) / totalDuration) * 100;
    return Math.min(Math.max(rawPct, 0), 100);
  };

  const nowPct = getPct(new Date().toISOString());
  const isOverdue = now > end;

  const totalDays = Math.max(1, Math.ceil(totalDuration / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.min(
    totalDays,
    Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24))),
  );
  const daysRemaining = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

  // Sort milestones chronologically
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(milestoneDate(a)).getTime() - new Date(milestoneDate(b)).getTime(),
  );

  return (
    <div className="w-full py-12 px-6 bg-muted/10 border border-border rounded-xl relative overflow-hidden">
      {/* Background Subtle Gradients */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-20" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="rounded-md border border-border/60 bg-card/80 px-2 py-1.5 text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Total duration</p>
          <p className="text-base font-bold text-foreground">{totalDays} days</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card/80 px-2 py-1.5 text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Elapsed</p>
          <p className="text-base font-bold text-blue-600">{daysElapsed} days</p>
        </div>
        <div className="rounded-md border border-border/60 bg-card/80 px-2 py-1.5 text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
            {daysRemaining >= 0 ? "Remaining" : "Overdue by"}
          </p>
          <p className={`text-base font-bold ${daysRemaining < 0 ? "text-rose-500" : "text-emerald-600"}`}>
            {Math.abs(daysRemaining)} days
          </p>
        </div>
        <div className="rounded-md border border-border/60 bg-card/80 px-2 py-1.5 text-center">
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Timeline progress</p>
          <p className="text-base font-bold text-foreground">{Math.round(Math.min(nowPct, 100))}%</p>
        </div>
      </div>

      <div className="relative flex items-center justify-between mb-10">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Chronological Project Flow</h3>
        </div>
        <div className="flex gap-3 items-center text-[10px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Completed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Pending</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span> Delayed</span>
        </div>
      </div>

      {/* Timeline Track */}
      <div className="relative h-16 w-full flex items-center mt-8 mb-12">
        {/* Underlay Track */}
        <div className="absolute h-1.5 w-full bg-muted rounded-full"></div>
        
        {/* Active Completed Track */}
        <div 
          className={`absolute h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(nowPct, 100)}%` }}
        ></div>

        {/* Today Indicator Line / Pulsing Dot */}
        {nowPct >= 0 && nowPct <= 100 && (
          <div 
            className="absolute z-10 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${nowPct}%` }}
          >
            <div className="absolute -top-7 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-md shadow-indigo-500/30 whitespace-nowrap">
              TODAY
            </div>
            <span className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-600 border-2 border-background"></span>
            </span>
            <div className="absolute top-4 h-4 w-0.5 border-l-2 border-dashed border-indigo-400/50"></div>
          </div>
        )}

        {/* End Points labels */}
        <div className="absolute -left-2 flex flex-col items-center -translate-y-8 shrink-0">
          <div className="bg-card border border-border text-[9px] px-2 py-1 rounded shadow-sm whitespace-nowrap font-mono text-muted-foreground">
            START: {new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
          <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-background mt-2 shadow"></div>
        </div>

        <div className="absolute -right-2 flex flex-col items-center -translate-y-8 shrink-0">
          <div className={`border ${isOverdue ? 'bg-rose-500/10 border-rose-500/40 text-rose-500' : 'bg-card border-border text-muted-foreground'} text-[9px] px-2 py-1 rounded shadow-sm whitespace-nowrap font-mono`}>
            DEADLINE: {new Date(deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
          <div className={`w-3 h-3 ${isOverdue ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'} rounded-full border-2 border-background mt-2 shadow`}></div>
        </div>

        {/* Milestone Indicators */}
        <TooltipProvider delayDuration={100}>
          {sortedMilestones.map((milestone, index) => {
            const pct = getPct(milestoneDate(milestone));
            const isEven = index % 2 === 0;
            
            let dotColor = "bg-blue-500";
            let icon = <Hourglass className="h-3 w-3 text-white" />;
            if (milestone.status === 'completed') {
              dotColor = "bg-green-500 shadow-green-500/40";
              icon = <CheckCircle2 className="h-3 w-3 text-white" />;
            } else if (milestone.status === 'delayed') {
              dotColor = "bg-rose-500 shadow-rose-500/40";
              icon = <AlertCircle className="h-3 w-3 text-white" />;
            }

            return (
              <div 
                key={milestone.id}
                className="absolute z-20 -translate-x-1/2 transition-transform hover:scale-125 duration-200"
                style={{ left: `${pct}%` }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className={`w-7 h-7 rounded-full ${dotColor} border-2 border-background flex items-center justify-center shadow-lg cursor-pointer outline-none transition-all`}
                    >
                      {icon}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side={isEven ? "top" : "bottom"} className="max-w-[200px] bg-card/95 border border-border shadow-xl p-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold truncate text-foreground">{milestone.title}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-[8px] h-3.5 px-1 leading-none ${
                            milestone.status === 'completed' ? 'text-green-500 border-green-500/20' :
                            milestone.status === 'delayed' ? 'text-rose-500 border-rose-500/20' : 'text-blue-500 border-blue-500/20'
                          }`}
                        >
                          {milestone.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" /> {new Date(milestoneDate(milestone)).toLocaleDateString()}
                      </p>
                      {milestone.assigneeName && (
                        <p className="text-[9px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                          <Avatar className="h-4 w-4 shrink-0">
                            {milestone.assigneeAvatarUrl && (
                              <AvatarImage src={milestone.assigneeAvatarUrl} alt={milestone.assigneeName} />
                            )}
                            <AvatarFallback className="text-[7px] bg-primary/15 text-primary">
                              {milestone.assigneeName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">
                            {milestone.assigneeName}
                            {milestone.assigneeRole ? ` · ${milestone.assigneeRole}` : ""}
                          </span>
                        </p>
                      )}
                      {milestone.description && (
                        <p className="text-[9px] text-muted-foreground border-t border-border/50 pt-1 mt-1 truncate-2-lines">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
                
                {/* Label placed conditionally above or below */}
                <div className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none ${isEven ? '-translate-y-14' : 'translate-y-3'}`}>
                  <span className="text-[9px] font-semibold text-foreground opacity-80 block text-center truncate max-w-[80px]">
                    {milestone.title}
                  </span>
                </div>
              </div>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Overdue warning banner */}
      {isOverdue && (
        <div className="mt-6 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center gap-3 animate-pulse">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-rose-500">System Alert: Project Deadline Exceeded</p>
            <p className="text-[10px] text-rose-500/80">The project elapsed standard operating schedules. Review milestones urgently.</p>
          </div>
        </div>
      )}
    </div>
  );
}
