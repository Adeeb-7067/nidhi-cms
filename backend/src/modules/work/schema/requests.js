import mongoose, { Schema } from "mongoose";
const requestTypes = ["software_license", "hardware", "api_access", "server_hosting", "design_asset", "add_on_work", "other"];
const requestUrgencies = ["low", "medium", "high"];
const requestStatuses = ["pending", "approved", "rejected"];
const resourceRequestSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  developerId: { type: Number, ref: "Users", required: true, index: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", required: true, index: true },
  type: { type: String, enum: requestTypes, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  urgency: { type: String, enum: requestUrgencies, default: "medium", required: true },
  status: { type: String, enum: requestStatuses, default: "pending", required: true },
  adminNote: { type: String }
}, { timestamps: true });
const ResourceRequests = mongoose.models.ResourceRequests || mongoose.model("ResourceRequests", resourceRequestSchema);
const resourceRequestsTable = ResourceRequests;
export {
  ResourceRequests,
  requestStatuses,
  requestTypes,
  requestUrgencies,
  resourceRequestsTable
};
