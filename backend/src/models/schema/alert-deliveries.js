import mongoose, { Schema } from "mongoose";
const alertDeliverySchema = new Schema({
  id: { type: Number, unique: true, required: true },
  alertId: { type: Number, ref: "Alerts", required: true, index: true },
  userId: { type: Number, ref: "Users", required: true, index: true },
  dismissedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});
alertDeliverySchema.index({ alertId: 1, userId: 1 }, { unique: true });
const AlertDeliveries = mongoose.models.AlertDeliveries || mongoose.model("AlertDeliveries", alertDeliverySchema);
const alertDeliveriesTable = AlertDeliveries;
export {
  AlertDeliveries,
  alertDeliveriesTable
};
