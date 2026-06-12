import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "./AppLayout";
import { PageOutlet } from "./PageOutlet";
import { ConsentDialog } from "@/components/monitoring/ConsentDialog";
import { WorkSessionProvider } from "@/contexts/WorkSessionContext";

/** Single persistent shell — sidebar/navbar stay mounted while pages change. */
export function AuthenticatedShell() {
  return (
    <ProtectedRoute allowedRoles={["super_admin", "developer", "tester", "qa", "client"]}>
      <WorkSessionProvider>
        <AppLayout>
          <PageOutlet />
        </AppLayout>
        <ConsentDialog />
      </WorkSessionProvider>
    </ProtectedRoute>
  );
}
