import mongoose, { Schema } from "mongoose";
const inventoryResourceTypes = [
  "file",
  "link",
  "figma",
  "repo",
  "document",
  "postman",
  "sdk",
  "config",
  "other"
];
const inventoryVisibility = ["team_only", "client_visible", "restricted"];
const inventoryEnvTypes = ["development", "staging", "production"];
const inventoryEnvHealth = ["healthy", "degraded", "down", "unknown"];
const inventoryDeviceStatuses = ["available", "assigned", "repair", "retired"];
const inventorySubscriptionTypes = [
  "domain",
  "hosting",
  "ssl",
  "api",
  "license",
  "software",
  "cloud",
  "other"
];
const inventoryCredentialTypes = [
  "api_key",
  "hosting",
  "database",
  "admin",
  "firebase",
  "cloud",
  "login",
  "other"
];
const folderSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  parentId: { type: Number, default: null },
  name: { type: String, required: true },
  createdBy: { type: Number, ref: "Users", required: true },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
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
  updatedAt: { type: Date, default: Date.now }
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
  updatedAt: { type: Date, default: Date.now }
});
const credentialAccessLogSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  credentialId: { type: Number, ref: "InventoryCredentials", required: true, index: true },
  projectId: { type: Number, required: true, index: true },
  userId: { type: Number, ref: "Users", required: true },
  action: { type: String, enum: ["view", "copy", "create", "update", "delete"], required: true },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now }
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
  updatedAt: { type: Date, default: Date.now }
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
  updatedAt: { type: Date, default: Date.now }
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
  updatedAt: { type: Date, default: Date.now }
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
  createdAt: { type: Date, default: Date.now, index: true }
});
const InventoryFolders = mongoose.models.InventoryFolders || mongoose.model("InventoryFolders", folderSchema);
const InventoryResources = mongoose.models.InventoryResources || mongoose.model("InventoryResources", resourceSchema);
const InventoryCredentials = mongoose.models.InventoryCredentials || mongoose.model("InventoryCredentials", credentialSchema);
const InventoryCredentialAccessLogs = mongoose.models.InventoryCredentialAccessLogs || mongoose.model("InventoryCredentialAccessLogs", credentialAccessLogSchema);
const InventoryEnvironments = mongoose.models.InventoryEnvironments || mongoose.model("InventoryEnvironments", environmentSchema);
const InventoryDevices = mongoose.models.InventoryDevices || mongoose.model("InventoryDevices", deviceSchema);
const InventorySubscriptions = mongoose.models.InventorySubscriptions || mongoose.model("InventorySubscriptions", subscriptionSchema);
const InventoryActivities = mongoose.models.InventoryActivities || mongoose.model("InventoryActivities", activitySchema);
const inventoryFoldersTable = InventoryFolders;
const inventoryResourcesTable = InventoryResources;
const inventoryCredentialsTable = InventoryCredentials;
const inventoryCredentialAccessLogsTable = InventoryCredentialAccessLogs;
const inventoryEnvironmentsTable = InventoryEnvironments;
const inventoryDevicesTable = InventoryDevices;
const inventorySubscriptionsTable = InventorySubscriptions;
const inventoryActivitiesTable = InventoryActivities;
export {
  InventoryActivities,
  InventoryCredentialAccessLogs,
  InventoryCredentials,
  InventoryDevices,
  InventoryEnvironments,
  InventoryFolders,
  InventoryResources,
  InventorySubscriptions,
  inventoryActivitiesTable,
  inventoryCredentialAccessLogsTable,
  inventoryCredentialTypes,
  inventoryCredentialsTable,
  inventoryDeviceStatuses,
  inventoryDevicesTable,
  inventoryEnvHealth,
  inventoryEnvTypes,
  inventoryEnvironmentsTable,
  inventoryFoldersTable,
  inventoryResourceTypes,
  inventoryResourcesTable,
  inventorySubscriptionTypes,
  inventorySubscriptionsTable,
  inventoryVisibility
};
