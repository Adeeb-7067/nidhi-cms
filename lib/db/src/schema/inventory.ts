import mongoose, { Schema } from "mongoose";

export const inventoryResourceTypes = [
  "file",
  "link",
  "figma",
  "repo",
  "document",
  "postman",
  "sdk",
  "config",
  "other",
] as const;
export type InventoryResourceType = (typeof inventoryResourceTypes)[number];

export const inventoryVisibility = ["team_only", "client_visible", "restricted"] as const;
export type InventoryVisibility = (typeof inventoryVisibility)[number];

export const inventoryEnvTypes = ["development", "staging", "production"] as const;
export type InventoryEnvType = (typeof inventoryEnvTypes)[number];

export const inventoryEnvHealth = ["healthy", "degraded", "down", "unknown"] as const;
export type InventoryEnvHealth = (typeof inventoryEnvHealth)[number];

export const inventoryDeviceStatuses = ["available", "assigned", "repair", "retired"] as const;
export type InventoryDeviceStatus = (typeof inventoryDeviceStatuses)[number];

export const inventorySubscriptionTypes = [
  "domain",
  "hosting",
  "ssl",
  "api",
  "license",
  "software",
  "cloud",
  "other",
] as const;
export type InventorySubscriptionType = (typeof inventorySubscriptionTypes)[number];

export const inventoryCredentialTypes = [
  "api_key",
  "hosting",
  "database",
  "admin",
  "firebase",
  "cloud",
  "login",
  "other",
] as const;
export type InventoryCredentialType = (typeof inventoryCredentialTypes)[number];

const folderSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  parentId: { type: Number, default: null },
  name: { type: String, required: true },
  createdBy: { type: Number, ref: "Users", required: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const resourceSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  folderId: { type: Number, ref: "InventoryFolders", default: null },
  type: { type: String, enum: inventoryResourceTypes, default: "file", required: true },
  name: { type: String, required: true },
  description: { type: String },
  url: { type: String },
  fileUrl: { type: String },
  mimeType: { type: String },
  fileSize: { type: Number },
  tags: { type: [String], default: [] },
  category: { type: String },
  visibility: { type: String, enum: inventoryVisibility, default: "team_only", required: true },
  version: { type: Number, default: 1, required: true },
  parentResourceId: { type: Number, default: null },
  uploadedBy: { type: Number, ref: "Users", required: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const credentialSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  type: { type: String, enum: inventoryCredentialTypes, required: true },
  label: { type: String, required: true },
  username: { type: String },
  encryptedValue: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  url: { type: String },
  notes: { type: String },
  expiresAt: { type: Date },
  visibility: { type: String, enum: inventoryVisibility, default: "restricted", required: true },
  allowedRoles: { type: [String], default: ["super_admin"] },
  createdBy: { type: Number, ref: "Users", required: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const credentialAccessLogSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  credentialId: { type: Number, ref: "InventoryCredentials", required: true, index: true },
  projectId: { type: Number, required: true, index: true },
  userId: { type: Number, ref: "Users", required: true },
  action: { type: String, enum: ["view", "copy", "create", "update", "delete"], required: true },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const environmentSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  envType: { type: String, enum: inventoryEnvTypes, required: true },
  name: { type: String, required: true },
  url: { type: String },
  deploymentStatus: { type: String, default: "active" },
  healthStatus: { type: String, enum: inventoryEnvHealth, default: "unknown" },
  hostingDetails: { type: String },
  deploymentNotes: { type: String },
  linkedCredentialId: { type: Number, default: null },
  latestBuildId: { type: Number, default: null },
  lastDeployedAt: { type: Date },
  visibility: { type: String, enum: inventoryVisibility, default: "team_only" },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const deviceSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", index: true },
  deviceName: { type: String, required: true },
  brand: { type: String },
  model: { type: String },
  serialNumber: { type: String },
  imei: { type: String },
  assignedUserId: { type: Number, ref: "Users", default: null },
  status: { type: String, enum: inventoryDeviceStatuses, default: "available" },
  purchaseDate: { type: Date },
  notes: { type: String },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const subscriptionSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  type: { type: String, enum: inventorySubscriptionTypes, required: true },
  name: { type: String, required: true },
  provider: { type: String },
  cost: { type: String },
  renewalUrl: { type: String },
  expiresAt: { type: Date, required: true },
  lastRenewedAt: { type: Date },
  alertSent30: { type: Boolean, default: false },
  alertSent7: { type: Boolean, default: false },
  alertSentExpired: { type: Boolean, default: false },
  status: { type: String, default: "active" },
  notes: { type: String },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const activitySchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  actorId: { type: Number, ref: "Users", required: true },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: Number },
  entityName: { type: String },
  oldVal: { type: Schema.Types.Mixed },
  newVal: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const InventoryFolders =
  mongoose.models.InventoryFolders || mongoose.model("InventoryFolders", folderSchema);
export const InventoryResources =
  mongoose.models.InventoryResources || mongoose.model("InventoryResources", resourceSchema);
export const InventoryCredentials =
  mongoose.models.InventoryCredentials || mongoose.model("InventoryCredentials", credentialSchema);
export const InventoryCredentialAccessLogs =
  mongoose.models.InventoryCredentialAccessLogs ||
  mongoose.model("InventoryCredentialAccessLogs", credentialAccessLogSchema);
export const InventoryEnvironments =
  mongoose.models.InventoryEnvironments || mongoose.model("InventoryEnvironments", environmentSchema);
export const InventoryDevices =
  mongoose.models.InventoryDevices || mongoose.model("InventoryDevices", deviceSchema);
export const InventorySubscriptions =
  mongoose.models.InventorySubscriptions || mongoose.model("InventorySubscriptions", subscriptionSchema);
export const InventoryActivities =
  mongoose.models.InventoryActivities || mongoose.model("InventoryActivities", activitySchema);

export const inventoryFoldersTable = InventoryFolders;
export const inventoryResourcesTable = InventoryResources;
export const inventoryCredentialsTable = InventoryCredentials;
export const inventoryCredentialAccessLogsTable = InventoryCredentialAccessLogs;
export const inventoryEnvironmentsTable = InventoryEnvironments;
export const inventoryDevicesTable = InventoryDevices;
export const inventorySubscriptionsTable = InventorySubscriptions;
export const inventoryActivitiesTable = InventoryActivities;
