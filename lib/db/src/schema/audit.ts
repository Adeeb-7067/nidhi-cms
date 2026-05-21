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
  createdAt: { type: Date, default: Date.now },
});

export const AuditLogs = mongoose.models.AuditLogs || mongoose.model("AuditLogs", auditLogSchema);

export interface AuditLog {
  id: number;
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  oldVal: any;
  newVal: any;
  ipAddress: string | null;
  createdAt: Date;
}

export const auditLogsTable = AuditLogs;
