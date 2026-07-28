import mongoose, { Schema } from "mongoose";

/** @deprecated Legacy — migrated to `fields` on read */
const serverTypes = ["client_server", "company_server"];

const projectDocumentFieldTypes = ["text", "password", "url", "file", "textarea", "image"];
const projectDocumentRenewalKinds = ["domain", "hosting", "ssl", "other"];

const projectDocumentRenewalSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, enum: projectDocumentRenewalKinds, required: true },
    label: { type: String, default: "", trim: true },
    provider: { type: String, default: null, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    notes: { type: String, default: null },
    lastReminderAt: { type: Date, default: null },
  },
  { _id: false },
);

const projectDocumentFieldSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: projectDocumentFieldTypes, default: "text", required: true },
    value: { type: String, default: null },
    valueEnc: { type: String, default: null },
    valueIv: { type: String, default: null },
    valueTag: { type: String, default: null },
  },
  { _id: false },
);

/** @deprecated Legacy image embed */
const projectDocumentImageSchema = new Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, default: "" },
  },
  { _id: false },
);

const projectDocumentSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    projectId: { type: Number, ref: "Projects", unique: true, required: true, index: true },
    fields: { type: [projectDocumentFieldSchema], default: [] },
    renewals: { type: [projectDocumentRenewalSchema], default: [] },
    /** Legacy flat fields — kept for documents created before dynamic fields */
    figmaLink: { type: String, default: null, trim: true },
    serverType: { type: String, enum: serverTypes, default: "company_server" },
    serverHost: { type: String, default: null, trim: true },
    serverUser: { type: String, default: null, trim: true },
    serverPasswordEnc: { type: String, default: null },
    serverPasswordIv: { type: String, default: null },
    serverPasswordTag: { type: String, default: null },
    serverNotes: { type: String, default: null },
    firebaseEmail: { type: String, default: null, trim: true },
    firebasePasswordEnc: { type: String, default: null },
    firebasePasswordIv: { type: String, default: null },
    firebasePasswordTag: { type: String, default: null },
    firebaseProjectId: { type: String, default: null, trim: true },
    googleMapsApiKeyEnc: { type: String, default: null },
    googleMapsApiKeyIv: { type: String, default: null },
    googleMapsApiKeyTag: { type: String, default: null },
    playStoreKeystoreUrl: { type: String, default: null },
    playStoreKeyUrl: { type: String, default: null },
    sourceCodeUrl: { type: String, default: null },
    images: { type: [projectDocumentImageSchema], default: [] },
    extraNotes: { type: String, default: null },
    createdBy: { type: Number, ref: "Users", required: true },
    updatedBy: { type: Number, ref: "Users", required: true },
  },
  { timestamps: true },
);

projectDocumentSchema.index({ updatedAt: -1 });

const ProjectDocuments =
  mongoose.models.ProjectDocuments || mongoose.model("ProjectDocuments", projectDocumentSchema);

export {
  ProjectDocuments,
  projectDocumentFieldTypes,
  projectDocumentRenewalKinds,
  serverTypes,
};
