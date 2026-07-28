import mongoose, { Schema } from "mongoose";
import { MARKETING_MEDIA_KINDS } from "../../../constants/marketing.js";

/**
 * Org-wide file vault for Manage → Media (admin storage).
 * Single root folder: parentId = null.
 */
const adminMediaSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    parentId: { type: Number, ref: "AdminMediaItems", default: null, index: true },
    name: { type: String, required: true, trim: true },
    /**
     * Stable identity for vault defaults (e.g. "documents"). Survives rename so
     * ensureAdminMediaVault does not recreate premade folders.
     */
    seedKey: { type: String, default: null, trim: true, index: true },
    /** When true, vault sync will not overwrite the root folder display name. */
    nameLocked: { type: Boolean, default: false },
    kind: {
      type: String,
      enum: MARKETING_MEDIA_KINDS,
      required: true,
      index: true,
    },
    extension: { type: String, default: null, trim: true },
    sizeBytes: { type: Number, default: null, min: 0 },
    url: { type: String, default: null },
    storageKey: { type: String, default: null },
    mimetype: { type: String, default: null },
    createdBy: { type: Number, ref: "Users", required: true },
    isDeleted: { type: Boolean, default: false, required: true, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

adminMediaSchema.index({ parentId: 1, isDeleted: 1 });
adminMediaSchema.index({ name: 1 });

const AdminMediaItems =
  mongoose.models.AdminMediaItems || mongoose.model("AdminMediaItems", adminMediaSchema);

export { AdminMediaItems };
