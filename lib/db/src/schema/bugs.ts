import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";

export const bugSeverityEnum = pgEnum("bug_severity", ["critical", "high", "medium", "low"]);
export const bugPriorityEnum = pgEnum("bug_priority", ["p1", "p2", "p3", "p4"]);
export const bugStatusEnum = pgEnum("bug_status", ["open", "in_progress", "fixed", "verified", "wont_fix", "duplicate"]);
export const bugPlatformEnum = pgEnum("bug_platform", ["android", "ios", "web", "api", "all"]);

export const bugsTable = pgTable("bugs", {
  id: serial("id").primaryKey(),
  bugNumber: text("bug_number").notNull().unique(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  reporterId: integer("reporter_id").notNull().references(() => usersTable.id),
  assigneeId: integer("assignee_id").references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description"),
  stepsToReproduce: text("steps_to_reproduce"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  severity: bugSeverityEnum("severity").notNull().default("medium"),
  priority: bugPriorityEnum("priority").notNull().default("p3"),
  status: bugStatusEnum("status").notNull().default("open"),
  buildVersion: text("build_version"),
  platform: bugPlatformEnum("platform").notNull().default("web"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBugSchema = createInsertSchema(bugsTable).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true });
export type InsertBug = z.infer<typeof insertBugSchema>;
export type Bug = typeof bugsTable.$inferSelect;
