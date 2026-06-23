import RolesPermissionsPage from "@/pages/admin/RolesPermissions";
import { HrmGate } from "@/modules/hrm/HrmGate";

/** HRM route wrapper for the shared CMS roles & permissions matrix. */
export default function HrmRolesEditorPage() {
  return (
    <HrmGate module="roles">
      <RolesPermissionsPage />
    </HrmGate>
  );
}
