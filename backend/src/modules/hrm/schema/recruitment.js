import mongoose, { Schema } from "mongoose";
import { recruitmentStages, onboardingStatuses } from "../../../constants/hrm-workflow.js";

const candidateSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String },
  position: { type: String, required: true },
  departmentId: { type: Number, index: true },
  stage: { type: String, enum: recruitmentStages, default: "applied", index: true },
  notes: { type: String },
  resumeUrl: { type: String },
  experienceYears: { type: Number },
  source: { type: String },
  rating: { type: Number, min: 0, max: 5 },
  hiredUserId: { type: Number, index: true },
}, { timestamps: true });

const onboardingTaskSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  candidateId: { type: Number, required: true, index: true },
  userId: { type: Number, index: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

const onboardingTaskItemSchema = new Schema(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false },
);

/** Employee onboarding checklist (Satyakabir model — one record per hire). */
const onboardingRecordSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, required: true, unique: true, index: true },
  candidateId: { type: Number, index: true },
  buddyId: { type: Number, index: true },
  startDate: { type: Date, default: Date.now },
  status: { type: String, enum: onboardingStatuses, default: "active", index: true },
  tasks: { type: [onboardingTaskItemSchema], default: [] },
}, { timestamps: true });

const Candidates = mongoose.models.Candidates || mongoose.model("Candidates", candidateSchema);
const OnboardingTasks = mongoose.models.OnboardingTasks || mongoose.model("OnboardingTasks", onboardingTaskSchema);
const OnboardingRecords =
  mongoose.models.OnboardingRecords || mongoose.model("OnboardingRecords", onboardingRecordSchema);

const candidatesTable = Candidates;
const onboardingTasksTable = OnboardingTasks;
const onboardingRecordsTable = OnboardingRecords;

export {
  Candidates,
  OnboardingTasks,
  OnboardingRecords,
  candidatesTable,
  onboardingTasksTable,
  onboardingRecordsTable,
};
