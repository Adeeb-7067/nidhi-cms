import { pgTable, serial, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const threadTypeEnum = pgEnum("thread_type", ["project", "log", "bug", "apk", "request"]);

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").notNull().references(() => usersTable.id),
  threadType: threadTypeEnum("thread_type").notNull(),
  threadId: integer("thread_id").notNull(),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;
