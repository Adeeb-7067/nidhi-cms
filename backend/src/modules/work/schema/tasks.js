import mongoose, { Schema } from "mongoose";
const taskStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked"];
const taskPriorities = ["urgent", "high", "normal", "low"];
const taskTypes = ["task", "feature", "bug_fix", "qa", "chore"];
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
    completedAt: { type: Date }
  },
  { timestamps: true }
);
taskSchema.index({ createdAt: -1 });
taskSchema.index({ assigneeId: 1, status: 1 });
const Tasks = mongoose.models.Tasks || mongoose.model("Tasks", taskSchema);
const tasksTable = Tasks;
export {
  Tasks,
  taskPriorities,
  taskStatuses,
  taskTypes,
  tasksTable
};
