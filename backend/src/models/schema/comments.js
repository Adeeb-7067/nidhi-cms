import mongoose, { Schema } from "mongoose";
const threadTypes = ["project", "project_internal", "company_team", "company_team_unofficial", "direct", "log", "bug", "apk", "request", "ticket"];
const commentSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  authorId: { type: Number, ref: "Users", required: true, index: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", index: true },
  threadType: { type: String, enum: threadTypes, required: true, index: true },
  threadId: { type: Number, required: true, index: true },
  content: { type: String, default: "" },
  attachmentUrl: { type: String },
  attachmentName: { type: String },
  attachmentMimeType: { type: String },
  parentId: { type: Number, ref: "Comments" },
  mentionedUserIds: { type: [Number], default: [] },
  isEdited: { type: Boolean, default: false, required: true }
}, { timestamps: true });
const Comments = mongoose.models.Comments || mongoose.model("Comments", commentSchema);
const commentsTable = Comments;
export {
  Comments,
  commentsTable,
  threadTypes
};
