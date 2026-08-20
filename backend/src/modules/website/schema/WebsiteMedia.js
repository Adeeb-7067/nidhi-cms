import mongoose from "mongoose";

const WebsiteMediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
    },
    dimensions: {
      width: { type: Number, default: null },
      height: { type: Number, default: null },
    },
    altText: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

export const websiteMediaTable =
  mongoose.models.WebsiteMedia || mongoose.model("WebsiteMedia", WebsiteMediaSchema);
