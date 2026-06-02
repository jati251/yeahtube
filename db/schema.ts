import { pgTable, text, integer, real, primaryKey, serial } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Media Type enum ────────────────────────────────────

export const mediaTypeEnum = ["image", "video"] as const;

// ── Users ──────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  isWhitelisted: integer("is_whitelisted")
    .notNull()
    .default(0),
  isAdmin: integer("is_admin").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

// ── Categories ─────────────────────────────────────────

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

// ── Posts ──────────────────────────────────────────────

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: integer("category_id")
    .references(() => categories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`now()`),
});

// ── Media Files ────────────────────────────────────────

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  mediaType: text("media_type", { enum: mediaTypeEnum }).notNull(),
  fileSize: integer("file_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  duration: real("duration"),
  thumbnailKey: text("thumbnail_key"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

// ── Tags ───────────────────────────────────────────────

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

// ── Post-Tags Junction ─────────────────────────────────

export const postTags = pgTable(
  "post_tags",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.postId, table.tagId] }),
  }),
);

// ── Types ──────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type MediaFile = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
