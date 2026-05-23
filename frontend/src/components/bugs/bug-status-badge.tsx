import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BUG_STATUS_COLORS, formatBugStatusLabel, normalizeBugStatus } from "@/lib/bug-workflow";

export function BugStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = normalizeBugStatus(status);
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium px-2 py-0 h-5 whitespace-nowrap",
        BUG_STATUS_COLORS[key],
        className,
      )}
    >
      {formatBugStatusLabel(status)}
    </Badge>
  );
}
