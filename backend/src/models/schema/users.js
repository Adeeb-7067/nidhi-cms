import mongoose, { Schema } from "mongoose";
const userRoles = ["super_admin", "developer", "tester", "client"];
const userStatuses = ["active", "inactive", "suspended"];
const credentialTriggers = ["initial_setup", "admin_reset", "self_reset", "policy_expiry"];
const userSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  employeeId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: userRoles, default: "developer", required: true },
  subType: { type: String },
  designation: { type: String },
  avatarUrl: { type: String },
  department: { type: String, default: "Engineering" },
  phoneNumber: { type: String },
  joiningDate: { type: Date },
  linkedinUrl: { type: String },
  status: { type: String, enum: userStatuses, default: "active", required: true },
  forcePasswordChange: { type: Boolean, default: false, required: true },
  lastLoginAt: { type: Date },
  fcmTokens: { type: [String], default: [] }
}, { timestamps: true });
const Users = mongoose.models.Users || mongoose.model("Users", userSchema);
const credentialHistorySchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  entryNumber: { type: Number, required: true },
  setByUserId: { type: Number },
  setByLabel: { type: String, required: true },
  passwordEncrypted: { type: String, required: true },
  status: { type: String, default: "active", required: true },
  trigger: { type: String, enum: credentialTriggers, required: true },
  replacedAt: { type: Date }
}, { timestamps: true });
const CredentialHistoryModel = mongoose.models.CredentialHistory || mongoose.model("CredentialHistory", credentialHistorySchema);
const sessionsSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  refreshToken: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  ipAddress: { type: String },
  deviceInfo: { type: String }
}, { timestamps: true });
const Sessions = mongoose.models.Sessions || mongoose.model("Sessions", sessionsSchema);
const passwordResetTokensSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date }
}, { timestamps: true });
const PasswordResetTokens = mongoose.models.PasswordResetTokens || mongoose.model("PasswordResetTokens", passwordResetTokensSchema);
const usersTable = Users;
const credentialHistoryTable = CredentialHistoryModel;
const sessionsTable = Sessions;
const passwordResetTokensTable = PasswordResetTokens;
export {
  CredentialHistoryModel,
  PasswordResetTokens,
  Sessions,
  Users,
  credentialHistoryTable,
  credentialTriggers,
  passwordResetTokensTable,
  sessionsTable,
  userRoles,
  userStatuses,
  usersTable
};
