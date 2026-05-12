import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const companySettingsTable = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("My Agency"),
  logoUrl: text("logo_url"),
  address: text("address"),
  sealUrl: text("seal_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCompanySettingsSchema = createInsertSchema(companySettingsTable).omit({ id: true });
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;
export type CompanySettings = typeof companySettingsTable.$inferSelect;
