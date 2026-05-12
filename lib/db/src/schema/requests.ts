import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const requestTypeEnum = pgEnum("request_type", ["software_license", "hardware", "api_access", "server_hosting", "design_asset", "other"]);
export const requestUrgencyEnum = pgEnum("request_urgency", ["low", "medium", "high"]);
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "rejected"]);

export const resourceRequestsTable = pgTable("resource_requests", {
  id: serial("id").primaryKey(),
  developerId: integer("developer_id").notNull().references(() => usersTable.id),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  type: requestTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  urgency: requestUrgencyEnum("urgency").notNull().default("medium"),
  status: requestStatusEnum("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertResourceRequestSchema = createInsertSchema(resourceRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResourceRequest = z.infer<typeof insertResourceRequestSchema>;
export type ResourceRequest = typeof resourceRequestsTable.$inferSelect;
