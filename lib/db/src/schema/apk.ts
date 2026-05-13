import { pgTable, serial, text, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { apkSchedulesTable, apkAudienceEnum } from "./projects";

export const apkReleaseTypeEnum = pgEnum("apk_release_type", ["alpha", "beta", "rc", "production"]);
export const apkPlatformEnum = pgEnum("apk_platform", ["android", "ios"]);

export const apkReleasesTable = pgTable("apk_releases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id),
  uploaderId: integer("uploader_id").notNull().references(() => usersTable.id),
  version: text("version").notNull(),
  buildNumber: integer("build_number").notNull(),
  releaseType: apkReleaseTypeEnum("release_type").notNull().default("alpha"),
  changelog: text("changelog"),
  platform: apkPlatformEnum("platform").notNull().default("android"),
  minOsVersion: text("min_os_version"),
  fileUrl: text("file_url").notNull(),
  audience: apkAudienceEnum("audience").notNull().default("team_only"),
  apkScheduleId: integer("apk_schedule_id").references(() => apkSchedulesTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("apk_releases_project_id_idx").on(table.projectId),
]);

export const apkDownloadLogsTable = pgTable("apk_download_logs", {
  id: serial("id").primaryKey(),
  apkReleaseId: integer("apk_release_id").notNull().references(() => apkReleasesTable.id),
  userId: integer("user_id").references(() => usersTable.id),
  ipAddress: text("ip_address"),
  downloadedAt: timestamp("downloaded_at").notNull().defaultNow(),
});

export const insertApkReleaseSchema = createInsertSchema(apkReleasesTable).omit({ id: true, createdAt: true });
export type InsertApkRelease = z.infer<typeof insertApkReleaseSchema>;
export type ApkRelease = typeof apkReleasesTable.$inferSelect;
