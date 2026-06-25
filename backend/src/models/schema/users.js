import mongoose, { Schema } from "mongoose";
import {
  adminStaffRoles,
  staffEmployeeRoles,
  userRoles,
} from "../../constants/user-roles.js";
import {
  employeeGenders,
  employeeMaritalStatuses,
  employeeTypes,
  hrEmploymentStatuses,
  employeePositions,
  employeeBloodGroups,
  employeeWeekDays,
  embeddedDocumentTypes,
  embeddedDocumentStatuses,
} from "../../constants/employee-profile.js";

const userStatuses = ["active", "inactive", "suspended"];
const credentialTriggers = ["initial_setup", "admin_reset", "self_reset", "policy_expiry"];

const addressSchema = new Schema(
  {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  { _id: false },
);

const bankAccountSchema = new Schema(
  {
    accountHolderName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    bankName: { type: String, default: "" },
    branchName: { type: String, default: "" },
    ifsc: { type: String, default: "" },
  },
  { _id: false },
);

const salarySchema = new Schema(
  {
    basicSalary: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    bankAccount: { type: bankAccountSchema, default: () => ({}) },
  },
  { _id: false },
);

const socialProfilesSchema = new Schema(
  {
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    facebook: { type: String, default: "" },
    instagram: { type: String, default: "" },
    website: { type: String, default: "" },
  },
  { _id: false },
);

const userSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  employeeId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  /** Validated in users.controller via permissions.service (supports dynamic roles from DB). */
  role: { type: String, default: "developer", required: true, trim: true, lowercase: true },
  subType: { type: String },
  designation: { type: String },
  avatarUrl: { type: String },
  image: { type: String },
  department: { type: String, default: "Engineering" },
  departmentId: { type: Number, ref: "Departments", index: true },
  reportingManagerId: { type: Number, ref: "Users", index: true },
  managerId: { type: Number, ref: "Users", index: true },
  teamleaderId: { type: Number, ref: "Users", index: true },
  hrmRoleTemplateId: { type: Number, ref: "HrmRoleTemplates", index: true },
  roleTemplateId: { type: Number, ref: "HrmRoleTemplates", index: true },
  wfhMonthlyLimit: { type: Number, default: 4, min: 0 },
  wfh: {
    monthlyLimit: { type: Number, default: null },
  },
  leaveAccrualDaysPerMonth: { type: Number, min: 0, default: null },
  /** YYYY-MM of the last monthly paid-leave accrual credit (dedupes lazy + scheduled runs). */
  lastLeaveAccrualPeriod: { type: String, default: null, trim: true },
  leave: {
    monthlyQuota: { type: Number, default: 1, min: 0 },
  },
  monthlyLeaveQuota: { type: Number, default: 1, min: 0 },
  phoneNumber: { type: String },
  joiningDate: { type: Date },
  exitDate: { type: Date },
  probationEndDate: { type: Date },
  linkedinUrl: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: employeeGenders },
  maritalStatus: { type: String, enum: employeeMaritalStatuses },
  permanentAddress: addressSchema,
  currentAddress: addressSchema,
  employeeType: { type: String, enum: employeeTypes, default: "FULL-TIME" },
  hrEmploymentStatus: { type: String, enum: hrEmploymentStatuses, default: "Active" },
  salary: salarySchema,
  shiftId: { type: Number, index: true },
  weeklyOff: { type: [String], enum: employeeWeekDays, default: ["Sunday"] },
  bio: { type: String, maxlength: 4000, default: "" },
  bloodGroup: { type: String, enum: employeeBloodGroups, default: "" },
  socialProfiles: { type: socialProfilesSchema, default: () => ({}) },
  emergencyContacts: [
    {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
    },
  ],
  workExperience: [
    {
      company: { type: String, trim: true },
      designation: { type: String, trim: true },
      fromDate: { type: Date },
      toDate: { type: Date },
      isCurrent: { type: Boolean, default: false },
      description: { type: String, default: "" },
    },
  ],
  profileDocuments: [
    {
      name: { type: String, required: true, trim: true },
      type: { type: String, enum: embeddedDocumentTypes, default: "Other" },
      status: { type: String, enum: embeddedDocumentStatuses, default: "Active" },
      fileUrl: { type: String, required: true },
      mimeType: { type: String, default: "" },
      uploadedByName: { type: String, default: "" },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  awards: [
    {
      title: { type: String, trim: true },
      issuedBy: { type: String, trim: true },
      date: { type: Date },
      description: { type: String, default: "" },
    },
  ],
  resumeUrl: { type: String },
  idProofUrl: { type: String },
  addressProofUrl: { type: String },
  certificateUrls: [String],
  username: { type: String, sparse: true },
  position: { type: String, enum: employeePositions, default: "EMPLOYEE" },
  aadharNumber: { type: Number },
  panNumber: { type: String },
  leaveBalance: { type: Number, default: 0 },
  totalWorkFromHome: { type: Number, default: 0 },
  leaveAvailable: { type: Number, default: 0 },
  lateChargePercentage: { type: Number, default: 100, min: 0, max: 100 },
  leaveHistory: [
    {
      month: { type: Number },
      year: { type: Number },
      allotted: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
    },
  ],
  status: { type: String, enum: userStatuses, default: "active", required: true },
  forcePasswordChange: { type: Boolean, default: false, required: true },
  lastLoginAt: { type: Date },
  lastSeenAt: { type: Date },
  fcmTokens: { type: [String], default: [] },
}, { timestamps: true });

userSchema.index({ role: 1, status: 1, departmentId: 1 });
userSchema.index({ reportingManagerId: 1, status: 1 });

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
const passwordOtpPurposes = ["forgot_password", "change_password"];

const passwordResetTokensSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, index: true },
  email: { type: String, lowercase: true, index: true },
  /** Legacy link token (optional; not used for email OTP records) */
  token: { type: String, sparse: true, index: true },
  otpHash: { type: String },
  purpose: { type: String, enum: passwordOtpPurposes, default: "forgot_password", index: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: { type: Date },
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
  passwordOtpPurposes,
  passwordResetTokensTable,
  sessionsTable,
  userRoles,
  userStatuses,
  staffEmployeeRoles,
  adminStaffRoles,
  usersTable
};
