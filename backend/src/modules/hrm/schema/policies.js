import mongoose, { Schema } from "mongoose";

const hrmPolicySchema = new Schema({
  id: { type: Number, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: "General" },
  fileUrl: { type: String },
  version: { type: String, default: "1.0" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const policyAcknowledgementSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  policyId: { type: Number, required: true, index: true },
  userId: { type: Number, required: true, index: true },
  acknowledgedAt: { type: Date, default: Date.now },
}, { timestamps: true });

policyAcknowledgementSchema.index({ policyId: 1, userId: 1 }, { unique: true });

const HrmPolicies = mongoose.models.HrmPolicies || mongoose.model("HrmPolicies", hrmPolicySchema);
const PolicyAcknowledgements = mongoose.models.PolicyAcknowledgements || mongoose.model("PolicyAcknowledgements", policyAcknowledgementSchema);
const hrmPoliciesTable = HrmPolicies;
const policyAcknowledgementsTable = PolicyAcknowledgements;

export { HrmPolicies, PolicyAcknowledgements, hrmPoliciesTable, policyAcknowledgementsTable };
