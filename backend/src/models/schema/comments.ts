import mongoose, { Schema } from "mongoose";

export const threadTypes = ["project", "log", "bug", "apk", "request"] as const;
export type ThreadType = typeof threadTypes[number];

const commentSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  authorId: { type: Number, ref: "Users", required: true, index: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", index: true },
  threadType: { type: String, enum: threadTypes, required: true, index: true },
  threadId: { type: Number, required: true, index: true },
  content: { type: String, required: true },
  parentId: { type: Number, ref: "Comments" },
  isEdited: { type: Boolean, default: false, required: true },
}, { timestamps: true });

export const Comments = mongoose.models.Comments || mongoose.model("Comments", commentSchema);

export interface Comment {
  id: number;
  authorId: number;
  companyId: number | null;
  projectId: number | null;
  threadType: ThreadType;
  threadId: number;
  content: string;
  parentId: number | null;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const commentsTable = Comments;
