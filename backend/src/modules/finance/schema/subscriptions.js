import mongoose, { Schema } from "mongoose";

const subscriptionStatuses = ["active", "cancelled"];
const billingCycles = ["monthly", "yearly"];

const assignmentSchema = new Schema(
  {
    id: { type: Number, required: true },
    employeeId: { type: Number, ref: "Users", required: true },
    seatEmail: { type: String, default: null, trim: true },
    assignedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    notes: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const subscriptionSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    reference: { type: String, unique: true, required: true },
    name: { type: String, required: true, trim: true },
    vendorName: { type: String, default: null, trim: true },
    plan: { type: String, default: null, trim: true },
    billingCycle: { type: String, enum: billingCycles, default: "monthly", required: true },
    seatsPurchased: { type: Number, required: true, min: 1 },
    /** Cost per billing cycle (total bill for this subscription). */
    costAmount: { type: Number, required: true, min: 0 },
    /** Account / login email used to buy this subscription. */
    purchaseEmail: { type: String, default: null, trim: true, lowercase: true },
    renewalDate: { type: Date, default: null },
    status: { type: String, enum: subscriptionStatuses, default: "active", required: true, index: true },
    notes: { type: String, default: null, trim: true },
    assignments: { type: [assignmentSchema], default: [] },
    createdBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

subscriptionSchema.index({ status: 1, createdAt: -1 });
subscriptionSchema.index({ name: 1 });
subscriptionSchema.index({ "assignments.employeeId": 1 });

const FinanceSubscriptions =
  mongoose.models.FinanceSubscriptions || mongoose.model("FinanceSubscriptions", subscriptionSchema);

export { FinanceSubscriptions, subscriptionStatuses, billingCycles };
