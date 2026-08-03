import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-kit";
import AdminDeliveryOverview from "./AdminDeliveryOverview";
import StaffDevWorkspace from "./Workspace";

/**
 * Delivery home (`/dev`):
 * - Super Admin → dedicated Delivery Dashboard (agency ops)
 * - Developer / QA → personal staff workspace
 */
export default function DevHome() {
  const { user, isLoading, isInitializing } = useAuth();

  if (isInitializing || isLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Redirect to="/login" replace />;
  }

  if (user.role === "super_admin") {
    return <AdminDeliveryOverview />;
  }

  return <StaffDevWorkspace />;
}
