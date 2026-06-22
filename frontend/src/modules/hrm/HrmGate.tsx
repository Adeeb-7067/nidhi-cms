import React from "react";
import { PermissionGate } from "@/modules/permissions/PermissionGate";
import type { CmsAction } from "@/modules/permissions/constants";

/** HRM page gate — uses CMS-wide permission matrix (legacy HRM module names supported). */
export function HrmGate({
  module,
  action = "view",
  children,
}: {
  module: string;
  action?: CmsAction;
  children: React.ReactNode;
}) {
  return (
    <PermissionGate module={module} action={action}>
      {children}
    </PermissionGate>
  );
}
