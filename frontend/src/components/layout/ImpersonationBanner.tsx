import React from "react";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { formatStaffRoleLabel } from "@/lib/user-roles";

export function ImpersonationBanner() {
  const { isImpersonating, impersonation, stopImpersonation, isStoppingImpersonation, user } = useAuth();

  if (!isImpersonating || !impersonation) return null;

  const roleLabel = formatStaffRoleLabel(impersonation.targetUser.role).toLowerCase();
  const specialty = user?.subType?.trim();

  return (
    <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
      <div className="app-shell-container flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2 text-xs sm:items-center sm:text-sm">
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 sm:mt-0" />
          <p className="min-w-0 leading-snug text-foreground">
            Viewing as{" "}
            <span className="font-semibold">{impersonation.targetUser.name}</span>{" "}
            <span className="text-muted-foreground">
              ({roleLabel}
              {specialty ? ` · ${specialty}` : ""})
            </span>
            <span className="hidden text-muted-foreground sm:inline">
              {" "}
              · Your super admin session is still active
            </span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 border-amber-500/40 bg-background/80 text-xs font-semibold"
          disabled={isStoppingImpersonation}
          onClick={() => void stopImpersonation()}
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          {isStoppingImpersonation ? "Returning…" : "Back to super admin"}
        </Button>
      </div>
    </div>
  );
}
