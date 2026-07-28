import mongoose, { Schema } from "mongoose";
import { CA_NOTICE_DEPARTMENTS, CA_NOTICE_WORKFLOW } from "../../../constants/ca.js";

const caNoticeSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    department: {
      type: String,
      enum: CA_NOTICE_DEPARTMENTS,
      required: true,
      index: true,
    },
    reference: { type: String, required: true, trim: true, index: true },
    subject: { type: String, required: true, trim: true },
    receivedAt: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    workflowStatus: {
      type: String,
      enum: CA_NOTICE_WORKFLOW,
      default: "received",
      required: true,
      index: true,
    },
    assignedToId: { type: Number, ref: "Users", default: null, index: true },
    assignedToName: { type: String, default: null, trim: true },
    /** Reply / correspondence notes for workflow. */
    replyNotes: { type: String, default: null, trim: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const CaNotices = mongoose.models.CaNotices || mongoose.model("CaNotices", caNoticeSchema);

export { CaNotices };
