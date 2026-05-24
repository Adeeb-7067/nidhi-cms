import mongoose, { Schema } from "mongoose";
const ticketStatuses = ["open", "pending", "resolved", "closed"];
const ticketPriorities = ["low", "medium", "high", "urgent"];
const ticketAudiences = ["client", "staff"];
const ticketSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", index: true },
  creatorId: { type: Number, ref: "Users", required: true, index: true },
  /** client = raised by portal client; staff = dev / QA / tester */
  audience: { type: String, enum: ticketAudiences, default: "staff", index: true },
  assignedTo: { type: Number, ref: "Users", index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ticketStatuses, default: "open", required: true, index: true },
  priority: { type: String, enum: ticketPriorities, default: "medium", required: true },
  attachments: { type: [String], default: [] }
}, { timestamps: true });
const Tickets = mongoose.models.Tickets || mongoose.model("Tickets", ticketSchema);
const ticketsTable = Tickets;
export {
  Tickets,
  ticketAudiences,
  ticketPriorities,
  ticketStatuses,
  ticketsTable
};
