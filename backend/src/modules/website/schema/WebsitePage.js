import mongoose from "mongoose";

const WebsitePageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Page title is required"],
      trim: true,
      maxlength: [150, "Page title cannot exceed 150 characters"],
    },
    slug: {
      type: String,
      required: [true, "Page slug is required"],
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    pageType: {
      type: String,
      enum: ["standard", "landing", "service", "case_study", "article", "hub", "company", "careers", "contact", "portfolio", "insights"],
      default: "standard",
      index: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    draftBlocks: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    publishedRevisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebsiteRevision",
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    scheduledPublishAt: {
      type: Date,
      default: null,
    },
    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      keywords: [{ type: String }],
      ogImage: { type: String, default: "" },
      noIndex: { type: Boolean, default: false },
    },
    version: {
      type: Number,
      default: 1, // Used for Optimistic Locking
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed, // User ID (ObjectId or Number)
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed, // User ID (ObjectId or Number)
      required: true,
    },
  },
  { timestamps: true }
);

WebsitePageSchema.index({ slug: 1, status: 1 });
WebsitePageSchema.index(
  { scheduledPublishAt: 1 },
  { partialFilterExpression: { scheduledPublishAt: { $ne: null } } }
);

export const websitePagesTable =
  mongoose.models.WebsitePage || mongoose.model("WebsitePage", WebsitePageSchema);
