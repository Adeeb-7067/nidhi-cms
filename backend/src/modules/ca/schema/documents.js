import mongoose, { Schema } from "mongoose";
import { CA_DOCUMENT_CATEGORIES } from "../../../constants/ca.js";

const caDocumentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: CA_DOCUMENT_CATEGORIES,
      required: true,
      index: true,
    },
    version: { type: String, default: "1.0", trim: true },
    fileUrl: { type: String, default: null, trim: true },
    /** Optional link to a CA work item (filing, notice, etc.). */
    linkedEntityType: {
      type: String,
      enum: ["gst_filing", "tds_return", "roc_filing", "notice", "company_itr", "director_itr", "audit", "task"],
      default: null,
    },
    linkedEntityId: { type: Number, default: null, index: true },
    uploadedById: { type: Number, ref: "Users", default: null, index: true },
    uploadedByName: { type: String, default: null, trim: true },
    uploadedAt: { type: Date, default: Date.now, index: true },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const CaDocuments =
  mongoose.models.CaDocuments || mongoose.model("CaDocuments", caDocumentSchema);

export { CaDocuments };
