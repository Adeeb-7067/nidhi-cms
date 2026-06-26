import mongoose, { Schema } from "mongoose";
import { exitRequestStatuses } from "../../../constants/hrm-workflow.js";

const exitRequestSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    userId: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    resignationDate: { type: Date, required: true },
    lastWorkingDay: { type: Date, required: true },
    stage: { type: Number, min: 1, max: 6, default: 1, index: true },
    status: { type: String, enum: exitRequestStatuses, default: "active", index: true },
    assetReturnComplete: { type: Boolean, default: false },
    fnfSettled: { type: Boolean, default: false },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

exitRequestSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: "active" } },
);

const HrmExitRequests =
  mongoose.models.HrmExitRequests || mongoose.model("HrmExitRequests", exitRequestSchema);
const hrmExitRequestsTable = HrmExitRequests;

export { HrmExitRequests, hrmExitRequestsTable };
