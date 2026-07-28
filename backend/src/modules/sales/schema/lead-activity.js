import mongoose, { Schema } from "mongoose";

const leadActivityTypes = [
  "created",
  "status_change",
  "note_added",
  "assigned",
  "proposal_created",
  "follow_up_scheduled",
  "converted",
  "reminder_set",
  "field_updated",
  "document_uploaded",
  "document_removed",
];

const leadActivitySchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    leadId: { type: Number, ref: "SalesLeads", required: true, index: true },
    type: { type: String, enum: leadActivityTypes, required: true },
    description: { type: String, required: true },
    actorId: { type: Number, ref: "Users", default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

leadActivitySchema.index({ leadId: 1, createdAt: -1 });

const SalesLeadActivity =
  mongoose.models.SalesLeadActivity || mongoose.model("SalesLeadActivity", leadActivitySchema);

export { SalesLeadActivity, leadActivityTypes };
