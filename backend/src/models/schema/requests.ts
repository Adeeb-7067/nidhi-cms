import mongoose, { Schema } from "mongoose";

export const requestTypes = ["software_license", "hardware", "api_access", "server_hosting", "design_asset", "add_on_work", "other"] as const;
export const requestUrgencies = ["low", "medium", "high"] as const;
export const requestStatuses = ["pending", "approved", "rejected"] as const;

export type RequestType = typeof requestTypes[number];
export type RequestUrgency = typeof requestUrgencies[number];
export type RequestStatus = typeof requestStatuses[number];

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
  adminNote: { type: String },
}, { timestamps: true });

export const ResourceRequests = mongoose.models.ResourceRequests || mongoose.model("ResourceRequests", resourceRequestSchema);

export interface ResourceRequest {
  id: number;
  developerId: number;
  companyId: number | null;
  projectId: number;
  type: RequestType;
  title: string;
  description: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const resourceRequestsTable = ResourceRequests;
