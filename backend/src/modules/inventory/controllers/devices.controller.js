import { inventoryDevicesTable, usersTable, getNextSequence } from "../../../models/schema/index.js";
import { logInventoryActivity } from "../services/helpers.js";
import { guardInventoryAccess, parseProjectIdParam } from "./guard.js";
import { badRequest } from "../../../utils/route-errors.js";

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
  const assigneeIds = [...new Set(devices.map((d) => d.assignedUserId).filter(Boolean))];
  const assignees = assigneeIds.length
    ? await usersTable.find({ id: { $in: assigneeIds } }).select("id name").lean()
    : [];
  const assigneeById = new Map(assignees.map((u) => [u.id, u]));
  const formatted = devices.map((d) =>
    formatDeviceRow(d, d.assignedUserId ? (assigneeById.get(d.assignedUserId)?.name ?? null) : null),
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
