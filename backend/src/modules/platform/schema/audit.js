import mongoose, { Schema } from "mongoose";
const auditLogSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  actorId: { type: Number, ref: "Users" },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: Number },
  oldVal: { type: Schema.Types.Mixed },
  newVal: { type: Schema.Types.Mixed },
  ipAddress: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});
const AuditLogs = mongoose.models.AuditLogs || mongoose.model("AuditLogs", auditLogSchema);
const auditLogsTable = AuditLogs;
export {
  AuditLogs,
  auditLogsTable
};
