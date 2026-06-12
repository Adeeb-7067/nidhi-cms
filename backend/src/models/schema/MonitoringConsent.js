import mongoose, { Schema } from "mongoose";
const consentEventSchema = new Schema(
  {
    consentGivenAt: { type: Date },
    consentVersion: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { _id: false }
);

const monitoringConsentSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, ref: "Users", required: true, unique: true, index: true },
  consentGivenAt: { type: Date },
  consentVersion: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  // GDPR Article 7: full audit trail of every consent event for this user.
  history: { type: [consentEventSchema], default: [] },
});
const MonitoringConsent = mongoose.models.MonitoringConsent || mongoose.model("MonitoringConsent", monitoringConsentSchema);
const monitoringConsentsTable = MonitoringConsent;
export {
  MonitoringConsent,
  monitoringConsentsTable
};
