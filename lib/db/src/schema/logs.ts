import { pgTable, serial, text, timestamp, integer, numeric, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const dailyLogsTable = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  developerId: integer("developer_id").notNull().references(() => usersTable.id),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  logDate: date("log_date").notNull(),
  workCategories: text("work_categories").array().notNull().default([]),
  taskTitle: text("task_title").notNull(),
  taskDescription: text("task_description"),
  hoursSpent: numeric("hours_spent", { precision: 4, scale: 2 }).notNull(),
  completionPct: integer("completion_pct").notNull().default(0),
  blockers: text("blockers"),
  nextDayPlan: text("next_day_plan"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("logs_developer_id_idx").on(table.developerId),
  index("logs_project_id_idx").on(table.projectId),
  index("logs_log_date_idx").on(table.logDate),
]);

export const insertDailyLogSchema = createInsertSchema(dailyLogsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type DailyLog = typeof dailyLogsTable.$inferSelect;
