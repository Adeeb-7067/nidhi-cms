import { pgTable, serial, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const clientStatusEnum = pgEnum("client_status", ["active", "inactive", "on_hold"]);

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  businessId: text("business_id"),
  logoUrl: text("logo_url"),
  status: clientStatusEnum("status").notNull().default("active"),
  portalLogin: boolean("portal_login").notNull().default(false),
  userId: integer("user_id").references(() => usersTable.id),
  clientSince: timestamp("client_since").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
