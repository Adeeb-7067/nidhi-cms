import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "./AppLayout";
import { PageOutlet } from "./PageOutlet";
import { ConsentDialog } from "@/components/monitoring/ConsentDialog";
import { WorkSessionProvider } from "@/contexts/WorkSessionContext";
import { ClientTeamProvider } from "@/contexts/ClientTeamContext";
import { ALL_AUTHENTICATED_ROLES } from "@/lib/user-roles";
import { SalesAlerts } from "@/modules/sales/components/SalesAlerts";

/** Single persistent shell — sidebar/navbar stay mounted while pages change. */
export function AuthenticatedShell() {
  return (
    <ProtectedRoute allowedRoles={ALL_AUTHENTICATED_ROLES}>
      <WorkSessionProvider>
        <ClientTeamProvider>
          <AppLayout>
            <PageOutlet />
          </AppLayout>
          <ConsentDialog />
          <SalesAlerts />
        </ClientTeamProvider>
      </WorkSessionProvider>
    </ProtectedRoute>
  );
}
