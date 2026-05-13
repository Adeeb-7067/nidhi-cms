import { pgTable, serial, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { clientsTable } from "./clients";

export const projectStatusEnum = pgEnum("project_status", ["scoping", "in_progress", "on_hold", "uat", "completed"]);
export const projectPriorityEnum = pgEnum("project_priority", ["low", "medium", "high", "critical"]);
export const milestoneStatusEnum = pgEnum("milestone_status", ["pending", "completed", "delayed"]);
export const apkAudienceEnum = pgEnum("apk_audience", ["team_only", "client_visible"]);

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  pmId: integer("pm_id").references(() => usersTable.id),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("scoping"),
  priority: projectPriorityEnum("priority").notNull().default("medium"),
  startDate: timestamp("start_date").notNull(),
  deadline: timestamp("deadline").notNull(),
  techStack: text("tech_stack").array().notNull().default([]),
  figmaUrl: text("figma_url"),
  repoUrl: text("repo_url"),
  stagingUrl: text("staging_url"),
  productionUrl: text("production_url"),
  completionOverride: integer("completion_override"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("projects_client_id_idx").on(table.clientId),
  index("projects_status_idx").on(table.status),
]);

export const projectMembersTable = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  subType: text("sub_type"),
  completionPct: integer("completion_pct").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => [
  index("project_members_project_id_idx").on(table.projectId),
  index("project_members_user_id_idx").on(table.userId),
]);

export const apkSchedulesTable = pgTable("apk_schedules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  scheduledDate: timestamp("scheduled_date").notNull(),
  label: text("label").notNull(),
  audience: apkAudienceEnum("audience").notNull().default("team_only"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  plannedDate: timestamp("planned_date").notNull(),
  actualDate: timestamp("actual_date"),
  status: milestoneStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
export type ProjectMember = typeof projectMembersTable.$inferSelect;
export type ApkSchedule = typeof apkSchedulesTable.$inferSelect;
export type Milestone = typeof milestonesTable.$inferSelect;
