import mongoose from "mongoose";

const WebsiteRevisionSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebsitePage",
      required: true,
      index: true,
    },
    revisionNumber: {
      type: Number,
      required: true,
    },
    blocksSnapshot: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
    },
    seoSnapshot: {
      type: Object,
      required: true,
    },
    changeSummary: {
      type: String,
      default: "",
    },
    authorId: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  { timestamps: false }
);

WebsiteRevisionSchema.index({ pageId: 1, revisionNumber: -1 }, { unique: true });

export const websiteRevisionsTable =
  mongoose.models.WebsiteRevision || mongoose.model("WebsiteRevision", WebsiteRevisionSchema);
