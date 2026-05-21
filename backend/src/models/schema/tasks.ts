import mongoose, { Schema } from "mongoose";

export const taskStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked"] as const;
export const taskPriorities = ["urgent", "high", "normal", "low"] as const;
export const taskTypes = ["task", "feature", "bug_fix", "qa", "chore"] as const;

export type TaskStatus = (typeof taskStatuses)[number];
export type TaskPriority = (typeof taskPriorities)[number];
export type TaskType = (typeof taskTypes)[number];

const taskSchema = new Schema(
  {
    id: { type: Number, unique: true, required: true },
    taskNumber: { type: String, unique: true, required: true },
    companyId: { type: Number, ref: "Clients", index: true },
    projectId: { type: Number, ref: "Projects", required: true, index: true },
    createdById: { type: Number, ref: "Users", required: true, index: true },
    assigneeId: { type: Number, ref: "Users", index: true },
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: taskStatuses, default: "todo", required: true, index: true },
    priority: { type: String, enum: taskPriorities, default: "normal", required: true },
    type: { type: String, enum: taskTypes, default: "task", required: true },
    dueDate: { type: String },
    labels: { type: [String], default: [] },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

taskSchema.index({ createdAt: -1 });
taskSchema.index({ assigneeId: 1, status: 1 });

export const Tasks = mongoose.models.Tasks || mongoose.model("Tasks", taskSchema);

export interface Task {
  id: number;
  taskNumber: string;
  companyId: number | null;
  projectId: number;
  createdById: number;
  assigneeId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  dueDate: string | null;
  labels: string[];
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const tasksTable = Tasks;
