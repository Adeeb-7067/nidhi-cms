import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Calendar, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortalPageShell } from "@/components/layout/portal-page-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLegalCase } from "@/api/legal";
import { CASE_TYPE_LABELS } from "@/modules/legal/constants";
import {
  LegalPageHeader,
  LegalStatusBadge,
  LegalRiskBadge,
  LegalEmptyState,
  CounselAvatar,
} from "@/modules/legal/components";

export default function LegalCaseDetail() {
  const [, params] = useRoute("/legal/cases/:id");
  const caseId = Number(params?.id);
  const { data: legalCase, isLoading, isError } = useLegalCase(caseId);

  if (isLoading) {
    return (
      <PortalPageShell>
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading case…
        </div>
      </PortalPageShell>
    );
  }

  if (isError || !legalCase) {
    return (
      <LegalEmptyState
        title="Case not found"
        description={`No case with ID #${caseId} was found.`}
        actionLabel="Back to cases"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <PortalPageShell className="pb-24">
      <LegalPageHeader
        title={legalCase.caseNumber}
        description={legalCase.employeeName}
        breadcrumbs={[
          { label: "Legal", href: "/legal" },
          { label: "Cases", href: "/legal/cases" },
          { label: legalCase.caseNumber },
        ]}
        actions={
          <Button variant="outline" size="sm" className="h-8" asChild>
            <Link href="/legal/cases">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <LegalStatusBadge variant="case" value={legalCase.status} />
        <LegalRiskBadge level={legalCase.risk} />
        <span className="text-xs text-muted-foreground">{CASE_TYPE_LABELS[legalCase.type]}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">
              Department
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-sm font-semibold">{legalCase.department}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
              <User className="h-3 w-3" /> Assigned counsel
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <CounselAvatar name={legalCase.assignedTo?.name ?? "—"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase">Opened</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-sm font-semibold">
            {format(new Date(legalCase.openedAt), "MMM d, yyyy")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Next hearing
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 text-sm font-semibold">
            {legalCase.nextHearing
              ? format(new Date(legalCase.nextHearing), "MMM d, yyyy h:mm a")
              : "Not scheduled"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Case summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{legalCase.summary}</p>
          {legalCase.updatedAt ? (
            <p className="text-xs text-muted-foreground mt-4">
              Last updated {format(new Date(legalCase.updatedAt), "MMM d, yyyy h:mm a")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </PortalPageShell>
  );
}
