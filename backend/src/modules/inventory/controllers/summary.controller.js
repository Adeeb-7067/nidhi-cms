import {
  inventoryResourcesTable,
  inventoryCredentialsTable,
  inventoryEnvironmentsTable,
  inventoryDevicesTable,
  inventorySubscriptionsTable,
  apkReleasesTable,
} from "../../../models/schema/index.js";
import { CLIENT_PORTAL_APK_AUDIENCES } from "../../work/services/apk-access.js";
import { clientVisibilityFilter } from "../../access/services/inventory-access.js";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";

/** GET /api/projects/:projectId/inventory/summary */
export async function getProjectsByProjectIdInventorySummary(req, res) {
  const projectId = parseProjectIdParam(req);
  const access = await guardInventoryAccess(req, projectId);

  const notDeleted = { deletedAt: null };
  const vis = clientVisibilityFilter(access.isClient);

  const [resources, credentials, environments, devices, subscriptions, builds] = await Promise.all([
    inventoryResourcesTable.countDocuments({ projectId, ...notDeleted, ...vis }),
    access.isClient ? 0 : inventoryCredentialsTable.countDocuments({ projectId, ...notDeleted }),
    inventoryEnvironmentsTable.countDocuments({ projectId, ...notDeleted, ...vis }),
    inventoryDevicesTable.countDocuments({ projectId, ...notDeleted }),
    inventorySubscriptionsTable.countDocuments({ projectId, ...notDeleted }),
    apkReleasesTable.countDocuments({
      projectId,
      ...(access.isClient ? { audience: { $in: CLIENT_PORTAL_APK_AUDIENCES } } : {}),
    }),
  ]);

  res.json({ resources, credentials, environments, devices, subscriptions, builds });
}
