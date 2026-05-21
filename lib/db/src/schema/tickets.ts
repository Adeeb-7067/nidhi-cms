import mongoose, { Schema } from "mongoose";

export const ticketStatuses = ["open", "pending", "resolved", "closed"] as const;
export const ticketPriorities = ["low", "medium", "high", "urgent"] as const;

export type TicketStatus = typeof ticketStatuses[number];
export type TicketPriority = typeof ticketPriorities[number];

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
  attachments: { type: [String], default: [] },
}, { timestamps: true });

export const Tickets = mongoose.models.Tickets || mongoose.model("Tickets", ticketSchema);

export interface Ticket {
  id: number;
  companyId: number | null;
  projectId: number | null;
  creatorId: number;
  assignedTo: number | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const ticketsTable = Tickets;
