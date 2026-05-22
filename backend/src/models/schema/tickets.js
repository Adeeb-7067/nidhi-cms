import mongoose, { Schema } from "mongoose";
const ticketStatuses = ["open", "pending", "resolved", "closed"];
const ticketPriorities = ["low", "medium", "high", "urgent"];
const ticketSchema = new Schema({
  id: { type: Number, unique: true, required: true },
  companyId: { type: Number, ref: "Clients", index: true },
  projectId: { type: Number, ref: "Projects", index: true },
  creatorId: { type: Number, ref: "Users", required: true, index: true },
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
  ticketPriorities,
  ticketStatuses,
  ticketsTable
};
