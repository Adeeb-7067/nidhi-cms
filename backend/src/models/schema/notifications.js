import mongoose, { Schema } from "mongoose";
const notificationSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  userId: { type: Number, ref: "Users", required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: Number },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", index: true },
  relatedId: { type: Number },
  isRead: { type: Boolean, default: false, required: true, index: true },
  readAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
const Notifications = mongoose.models.Notifications || mongoose.model("Notifications", notificationSchema);
const notificationsTable = Notifications;
export {
  Notifications,
  notificationsTable
};
