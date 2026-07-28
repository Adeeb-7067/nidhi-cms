import { hrmAuditLogsTable, getNextSequence } from "../../../models/schema/index.js";

export async function logHrmAudit({
  actorId,
  action,
  entityType,
  entityId = null,
  severity = "info",
  oldVal = null,
  newVal = null,
  ipAddress = null,
  metadata = null,
}) {
  const id = await getNextSequence("hrm_audit_logs");
  return hrmAuditLogsTable.create({
    id,
    actorId,
    action,
    entityType,
    entityId,
    severity,
    oldVal,
    newVal,
    ipAddress,
    metadata,
  });
}
