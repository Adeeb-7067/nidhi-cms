import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { BugAssignee } from "@/api";
import { formatUserRole } from "@/lib/bug-workflow";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AssigneeAvatars({
  assignees,
  max = 4,
  size = "sm",
  className,
}: {
  assignees?: BugAssignee[] | null;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const list = assignees ?? [];
  if (list.length === 0) {
    return <span className="text-[10px] text-muted-foreground">Unassigned</span>;
  }

  const visible = list.slice(0, max);
  const overflow = list.length - visible.length;
  const dim = size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[9px]";

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("flex items-center -space-x-2", className)}>
        {visible.map((dev, i) => (
          <Tooltip key={dev.id}>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  dim,
                  "ring-2 ring-background border border-border/50 transition-transform hover:z-10 hover:scale-110",
                )}
                style={{ zIndex: visible.length - i }}
              >
                {dev.avatarUrl ? <AvatarImage src={dev.avatarUrl} alt={dev.name} /> : null}
                <AvatarFallback className="bg-primary/15 text-primary font-semibold">
                  {initials(dev.name)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {dev.name} · {formatUserRole(dev.role)}
              {dev.employeeId ? ` · ${dev.employeeId}` : ""}
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full bg-muted font-medium ring-2 ring-background",
              dim,
            )}
          >
            +{overflow}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
