import mongoose, { Schema } from "mongoose";
import { recruitmentStages } from "../../../constants/hrm.js";

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
  hiredUserId: { type: Number },
}, { timestamps: true });

const onboardingTaskSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  candidateId: { type: Number, required: true, index: true },
  userId: { type: Number, index: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

const Candidates = mongoose.models.Candidates || mongoose.model("Candidates", candidateSchema);
const OnboardingTasks = mongoose.models.OnboardingTasks || mongoose.model("OnboardingTasks", onboardingTaskSchema);
const candidatesTable = Candidates;
const onboardingTasksTable = OnboardingTasks;

export { Candidates, OnboardingTasks, candidatesTable, onboardingTasksTable };
