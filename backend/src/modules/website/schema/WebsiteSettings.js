import mongoose from "mongoose";

const WebsiteSettingsSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      default: "Satyakabir Technologies",
    },
    contactEmail: {
      type: String,
      default: "contact@satyakabir.com",
    },
    contactPhone: {
      type: String,
      default: "+91 755 493 8888",
    },
    address: {
      type: String,
      default: "Bhopal, Madhya Pradesh, India",
    },
    headerMenu: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    footerMenu: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    socialLinks: {
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
    seoDefaults: {
      titleTemplate: { type: String, default: "%s | Satyakabir Technologies" },
      defaultDescription: {
        type: String,
        default:
          "Enterprise Software Engineering, AI/ML Solutions, and Digital Transformation Systems.",
      },
      defaultOgImage: { type: String, default: "" },
    },
    theme: {
      primaryFont: { type: String, default: "Inter" },
      headingFont: { type: String, default: "Outfit" },
      primaryColor: { type: String, default: "#6366f1" },
      accentColor: { type: String, default: "#8b5cf6" },
      mode: { type: String, enum: ["dark", "light", "system"], default: "dark" },
      borderRadius: { type: String, default: "12px" },
      customCss: { type: String, default: "" },
      analyticsId: { type: String, default: "" },
      tagManagerId: { type: String, default: "" },
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

export const websiteSettingsTable =
  mongoose.models.WebsiteSettings || mongoose.model("WebsiteSettings", WebsiteSettingsSchema);
