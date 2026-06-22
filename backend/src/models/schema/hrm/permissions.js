import mongoose, { Schema } from "mongoose";
import { cmsActions, cmsModules } from "../../../constants/permissions.js";

const hrmRoleTemplateSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String },
  isSystem: { type: Boolean, default: false },
}, { timestamps: true });

const hrmPermissionSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  roleTemplateId: { type: Number, required: true, index: true },
  module: { type: String, enum: cmsModules, required: true },
  action: { type: String, enum: cmsActions, required: true },
}, { timestamps: true });

hrmPermissionSchema.index({ roleTemplateId: 1, module: 1, action: 1 }, { unique: true });

const HrmRoleTemplates = mongoose.models.HrmRoleTemplates || mongoose.model("HrmRoleTemplates", hrmRoleTemplateSchema);
const HrmPermissions = mongoose.models.HrmPermissions || mongoose.model("HrmPermissions", hrmPermissionSchema);
const hrmRoleTemplatesTable = HrmRoleTemplates;
const hrmPermissionsTable = HrmPermissions;

export { HrmRoleTemplates, HrmPermissions, hrmRoleTemplatesTable, hrmPermissionsTable };
