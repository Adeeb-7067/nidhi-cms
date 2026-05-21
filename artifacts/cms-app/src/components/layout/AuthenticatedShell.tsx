import React from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "./AppLayout";
import { PageOutlet } from "./PageOutlet";

/** Single persistent shell — sidebar/navbar stay mounted while pages change. */
export function AuthenticatedShell() {
  return (
    <ProtectedRoute allowedRoles={["super_admin", "developer", "tester", "client"]}>
      <AppLayout>
        <PageOutlet />
      </AppLayout>
    </ProtectedRoute>
  );
}
