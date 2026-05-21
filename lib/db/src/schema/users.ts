import mongoose, { Schema, Document } from "mongoose";

// Re-export enums to preserve SQL contract logic
export const userRoles = ["super_admin", "developer", "tester", "client"] as const;
export const userStatuses = ["active", "inactive", "suspended"] as const;
export const credentialTriggers = ["initial_setup", "admin_reset", "self_reset", "policy_expiry"] as const;

export type UserRole = typeof userRoles[number];
export type UserStatus = typeof userStatuses[number];
export type CredentialTrigger = typeof credentialTriggers[number];

// 1. User Schema
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
  fcmTokens: { type: [String], default: [] },
}, { timestamps: true });

export const Users = mongoose.models.Users || mongoose.model("Users", userSchema);

// 2. Credential History Schema
const credentialHistorySchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  entryNumber: { type: Number, required: true },
  setByUserId: { type: Number },
  setByLabel: { type: String, required: true },
  passwordEncrypted: { type: String, required: true },
  status: { type: String, default: "active", required: true },
  trigger: { type: String, enum: credentialTriggers, required: true },
  replacedAt: { type: Date },
}, { timestamps: true });

export const CredentialHistoryModel = mongoose.models.CredentialHistory || mongoose.model("CredentialHistory", credentialHistorySchema);

// 3. Sessions Schema
const sessionsSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  refreshToken: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  ipAddress: { type: String },
  deviceInfo: { type: String },
}, { timestamps: true });

export const Sessions = mongoose.models.Sessions || mongoose.model("Sessions", sessionsSchema);

// 4. Password Reset Tokens Schema
const passwordResetTokensSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date },
}, { timestamps: true });

export const PasswordResetTokens = mongoose.models.PasswordResetTokens || mongoose.model("PasswordResetTokens", passwordResetTokensSchema);

export interface User {
  id: number;
  employeeId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  subType: string | null;
  designation: string | null;
  avatarUrl: string | null;
  department: string;
  phoneNumber: string | null;
  joiningDate: Date | null;
  linkedinUrl: string | null;
  status: UserStatus;
  forcePasswordChange: boolean;
  lastLoginAt: Date | null;
  fcmTokens?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialHistory {
  id: number;
  userId: number;
  entryNumber: number;
  setByUserId: number | null;
  setByLabel: string;
  passwordEncrypted: string;
  status: string;
  trigger: CredentialTrigger;
  createdAt: Date;
  replacedAt: Date | null;
}

export interface Session {
  id: number;
  userId: number;
  refreshToken: string;
  expiresAt: Date;
  ipAddress: string | null;
  deviceInfo: string | null;
  createdAt: Date;
}

// For backward compatibility in imports referencing tables
export const usersTable = Users;
export const credentialHistoryTable = CredentialHistoryModel;
export const sessionsTable = Sessions;
export const passwordResetTokensTable = PasswordResetTokens;
