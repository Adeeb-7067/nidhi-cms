import React from "react";
import { usePermission, usePermissionLoading } from "./usePermission";
import { normalizeModule, type CmsAction } from "./constants";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export function PermissionGate({
  module,
  action = "view",
  children,
}: {
  module: string;
  action?: CmsAction;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const loading = usePermissionLoading();
  const allowed = usePermission(module, action);

  if (user?.role === "super_admin") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          You do not have {action} access for {normalizeModule(module).replace(/_/g, " ")}.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
