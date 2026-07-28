import mongoose, { Schema } from "mongoose";

const hrmAuditLogSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  actorId: { type: Number, ref: "Users", index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: Number, index: true },
  severity: { type: String, enum: ["info", "warning", "critical"], default: "info", index: true },
  oldVal: { type: Schema.Types.Mixed },
  newVal: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

hrmAuditLogSchema.index({ createdAt: -1 });
hrmAuditLogSchema.index({ severity: 1, createdAt: -1 });

const HrmAuditLogs = mongoose.models.HrmAuditLogs || mongoose.model("HrmAuditLogs", hrmAuditLogSchema);
const hrmAuditLogsTable = HrmAuditLogs;

export { HrmAuditLogs, hrmAuditLogsTable };
