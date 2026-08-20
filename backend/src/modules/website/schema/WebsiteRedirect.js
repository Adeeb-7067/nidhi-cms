import mongoose from "mongoose";

const WebsiteRedirectSchema = new mongoose.Schema(
  {
    fromPath: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    toPath: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    statusCode: {
      type: Number,
      enum: [301, 302, 410],
      default: 301,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdReason: {
      type: String,
      enum: ["manual", "slug_change"],
      default: "manual",
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

export const websiteRedirectsTable =
  mongoose.models.WebsiteRedirect || mongoose.model("WebsiteRedirect", WebsiteRedirectSchema);
