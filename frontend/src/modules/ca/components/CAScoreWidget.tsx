import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPercent } from "../constants";

export function CAScoreWidget({
  label,
  score,
  className,
}: {
  label: string;
  score: number;
  className?: string;
}) {
  const color =
    score >= 85 ? "text-emerald-700" : score >= 70 ? "text-amber-700" : "text-red-600";

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <p className={cn("text-2xl font-bold tabular-nums", color)}>{formatPercent(score)}</p>
        <Progress value={score} className="h-2 mt-2" />
      </CardContent>
    </Card>
  );
}
