import { inventoryDevicesTable, usersTable, getNextSequence } from "@/models/schema";
import { logInventoryActivity } from "@/services/inventory/helpers";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";
import { badRequest } from "@/utils/route-errors";

function formatDeviceRow(d, assignedName = null) {
  return {
    id: d.id,
    projectId: d.projectId,
    deviceName: d.deviceName,
    brand: d.brand ?? null,
    model: d.model ?? null,
    serialNumber: d.serialNumber ?? null,
    imei: d.imei ?? null,
    assignedUserId: d.assignedUserId ?? null,
    status: d.status,
    notes: d.notes ?? null,
    assignedName,
    purchaseDate: d.purchaseDate ? new Date(d.purchaseDate).toISOString() : null,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
  };
}

/** GET /api/projects/:projectId/inventory/devices */
export async function getProjectsByProjectIdInventoryDevices(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId);

  const devices = await inventoryDevicesTable.find({ projectId, deletedAt: null }).lean();

  const formatted = await Promise.all(
    devices.map(async (d) => {
      let assignedName = null;
      if (d.assignedUserId) {
        const u = await usersTable.findOne({ id: d.assignedUserId }).lean();
        assignedName = u?.name ?? null;
      }
      return formatDeviceRow(d, assignedName);
    }),
  );
  res.json(formatted);
}

/** POST /api/projects/:projectId/inventory/devices */
export async function postProjectsByProjectIdInventoryDevices(req, res) {
  const projectId = parseProjectIdParam(req);
  await guardInventoryAccess(req, projectId, true);

  const {
    deviceName,
    brand,
    model,
    serialNumber,
    imei,
    assignedUserId,
    status,
    purchaseDate,
    notes,
  } = req.body ?? {};

  if (!deviceName?.trim()) {
    badRequest("deviceName is required.", "deviceName");
  }

  const id = await getNextSequence("inventory_devices");
  const device = await inventoryDevicesTable.create({
    id,
    projectId,
    deviceName: String(deviceName).trim(),
    brand: brand ?? null,
    model: model ?? null,
    serialNumber: serialNumber ?? null,
    imei: imei ?? null,
    assignedUserId: assignedUserId ?? null,
    status: status ?? "available",
    purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
    notes: notes ?? null,
  });

  await logInventoryActivity(req, projectId, "device_added", "device", id, device.deviceName);
  res.status(201).json(formatDeviceRow(device.toObject()));
}
