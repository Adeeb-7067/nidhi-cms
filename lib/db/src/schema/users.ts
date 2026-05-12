import { pgTable, serial, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["super_admin", "developer", "client"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);
export const credentialTriggerEnum = pgEnum("credential_trigger", ["initial_setup", "admin_reset", "self_reset", "policy_expiry"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("developer"),
  subType: text("sub_type"),
  designation: text("designation"),
  avatarUrl: text("avatar_url"),
  status: userStatusEnum("status").notNull().default("active"),
  forcePasswordChange: boolean("force_password_change").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const credentialHistoryTable = pgTable("credential_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  entryNumber: integer("entry_number").notNull(),
  setByUserId: integer("set_by_user_id").references(() => usersTable.id),
  setByLabel: text("set_by_label").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  status: text("status").notNull().default("active"),
  trigger: credentialTriggerEnum("trigger").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  replacedAt: timestamp("replaced_at"),
});

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  refreshToken: text("refresh_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const employeeCounterTable = pgTable("employee_counter", {
  id: serial("id").primaryKey(),
  counter: integer("counter").notNull().default(0),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type CredentialHistory = typeof credentialHistoryTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
