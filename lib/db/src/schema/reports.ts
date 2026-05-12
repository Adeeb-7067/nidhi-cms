import { pgTable, serial, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const reportTypeEnum = pgEnum("report_type", ["developer_monthly", "project_progress", "bug_report", "team_utilisation", "client_dossier", "apk_release_history", "raw_log_export"]);
export const reportStatusEnum = pgEnum("report_status", ["queued", "generating", "ready", "failed"]);

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  type: reportTypeEnum("type").notNull(),
  status: reportStatusEnum("status").notNull().default("queued"),
  requestedBy: integer("requested_by").notNull().references(() => usersTable.id),
  projectId: integer("project_id").references(() => projectsTable.id),
  month: integer("month"),
  year: integer("year"),
  includeDescriptions: boolean("include_descriptions").notNull().default(false),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
