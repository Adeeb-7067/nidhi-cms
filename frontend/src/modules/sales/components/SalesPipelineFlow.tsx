import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SALES_PIPELINE_STAGES } from "../constants";

export function SalesPipelineFlow({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Sales pipeline status flow
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {SALES_PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold border",
                stage.color,
              )}
            >
              {stage.label}
            </span>
            {i < SALES_PIPELINE_STAGES.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type FeatureItem = {
  id: string;
  stage: string;
  feature: string;
  inUi: boolean;
  route?: string;
};

export function SalesFeatureCoverage({ features }: { features: FeatureItem[] }) {
  const byStage = features.reduce<Record<string, FeatureItem[]>>((acc, f) => {
    if (!acc[f.stage]) acc[f.stage] = [];
    acc[f.stage].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byStage).map(([stage, items]) => {
        const done = items.filter((i) => i.inUi).length;
        return (
          <div key={stage} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b">
              <p className="text-sm font-semibold">{stage}</p>
              <span className="text-xs text-muted-foreground">
                {done}/{items.length} in UI
              </span>
            </div>
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                  {item.inUi ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs", !item.inUi && "text-muted-foreground")}>
                      {item.feature}
                    </p>
                    {item.route && item.inUi && (
                      <p className="text-[10px] text-primary mt-0.5">{item.route}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
