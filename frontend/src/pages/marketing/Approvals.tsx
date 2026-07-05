import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CheckCircle } from "lucide-react";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent } from "@/components/ui/card";
import { mockApprovalItems } from "@/modules/marketing/mock-data";
import { APPROVAL_STAGE_LABELS, APPROVAL_STAGE_ORDER } from "@/modules/marketing/constants";
import type { ApprovalStage } from "@/modules/marketing/types";
import {
  MarketingPageHeader,
  MarketingFilterBar,
  ApprovalStatusBadge,
} from "@/modules/marketing/components";
import { cn } from "@/lib/utils";

export default function MarketingApprovals() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return mockApprovalItems.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.clientName.toLowerCase().includes(q),
    );
  }, [search]);

  const byStage = useMemo(() => {
    const map: Record<ApprovalStage, typeof filtered> = {
      internal_review: [],
      client_review: [],
      revision: [],
      approved: [],
      scheduled: [],
      published: [],
    };
    for (const item of filtered) {
      map[item.stage].push(item);
    }
    return map;
  }, [filtered]);

  return (
    <PortalPageShell>
      <MarketingPageHeader
        title="Approval workflow"
        description="Pipeline: Internal Review → Client Review → Revision → Approved → Scheduled → Published"
        breadcrumbs={[{ label: "Digital", href: "/marketing" }, { label: "Approvals" }]}
      />

      <MarketingFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search approvals, clients…" />

      <div className="flex gap-3 overflow-x-auto pb-4">
        {APPROVAL_STAGE_ORDER.map((stage) => (
          <div key={stage} className="min-w-[220px] flex-1 space-y-2">
            <div className="flex items-center justify-between px-1">
              <ApprovalStatusBadge stage={stage} />
              <span className="text-[10px] text-muted-foreground">{byStage[stage].length}</span>
            </div>
            <div className="space-y-2 min-h-[120px]">
              {byStage[stage].map((item) => (
                <Card key={item.id} className={cn("shadow-sm")}>
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-xs font-medium leading-snug">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{item.clientName}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{item.type}</span>
                      <span>{format(new Date(item.updatedAt), "MMM d")}</span>
                    </div>
                    <p className="text-[10px]">{item.assignee}</p>
                  </CardContent>
                </Card>
              ))}
              {byStage[stage].length === 0 && (
                <div className="rounded-lg border border-dashed px-3 py-6 text-center text-[10px] text-muted-foreground">
                  <CheckCircle className="h-4 w-4 mx-auto mb-1 opacity-40" />
                  No items
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Stages: {APPROVAL_STAGE_ORDER.map((s) => APPROVAL_STAGE_LABELS[s]).join(" → ")}
      </p>
    </PortalPageShell>
  );
}
