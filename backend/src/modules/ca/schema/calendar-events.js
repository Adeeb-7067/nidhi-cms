import mongoose, { Schema } from "mongoose";
import { CA_CALENDAR_CATEGORIES, CA_COMPLIANCE_TIMING } from "../../../constants/ca.js";

const caCalendarEventSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: CA_CALENDAR_CATEGORIES,
      required: true,
      index: true,
    },
    dueDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: CA_COMPLIANCE_TIMING,
      default: "upcoming",
      required: true,
      index: true,
    },
    ownerName: { type: String, default: null, trim: true },
    notes: { type: String, default: null, trim: true },
    sourceKey: { type: String, default: null, trim: true, index: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

caCalendarEventSchema.index({ dueDate: 1, status: 1 });
caCalendarEventSchema.index(
  { sourceKey: 1 },
  { unique: true, partialFilterExpression: { sourceKey: { $type: "string" } } },
);

const CaCalendarEvents =
  mongoose.models.CaCalendarEvents || mongoose.model("CaCalendarEvents", caCalendarEventSchema);

export { CaCalendarEvents };
