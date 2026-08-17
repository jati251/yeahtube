import { pgTable, text, integer, real, primaryKey, serial, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ── Categories ─────────────────────────────────────────

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ── Channel Enum ──────────────────────────────────────

export const channelEnum = ["public", "private"] as const;

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
  channel: text("channel", { enum: channelEnum }).notNull().default("private"),
  views: integer("views").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  createdAtIndex: index("posts_created_at_idx").on(table.createdAt),
  categoryIndex: index("posts_category_id_idx").on(table.categoryId),
  userIdIndex: index("posts_user_id_idx").on(table.userId),
  channelIndex: index("posts_channel_idx").on(table.channel),
  updatedAtIndex: index("posts_updated_at_idx").on(table.updatedAt),
  viewsIndex: index("posts_views_idx").on(table.views),
}));

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
  previewKey: text("preview_key"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  postIdIndex: index("media_post_id_idx").on(table.postId),
  mediaTypeIndex: index("media_type_idx").on(table.mediaType),
}));

// ── Tags ───────────────────────────────────────────────

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
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
    postIdIndex: index("post_tags_post_id_idx").on(table.postId),
    tagIdIndex: index("post_tags_tag_id_idx").on(table.tagId),
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

// ── Likes ──────────────────────────────────────────────

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  isLike: integer("is_like").notNull(), // 1 for like, 0 for dislike
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  userIdIndex: index("likes_user_id_idx").on(table.userId),
  postIdIndex: index("likes_post_id_idx").on(table.postId),
}));

export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;

// ── Comments ───────────────────────────────────────────

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  postIdIndex: index("comments_post_id_idx").on(table.postId),
}));

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

// ── Watch History ──────────────────────────────────────

export const watchHistory = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  watchedAt: timestamp("watched_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  userIdIndex: index("watch_history_user_id_idx").on(table.userId),
}));

export type WatchHistory = typeof watchHistory.$inferSelect;
export type NewWatchHistory = typeof watchHistory.$inferInsert;

// ── Playlists ──────────────────────────────────────────

export const playlists = pgTable("playlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  channel: text("channel", { enum: channelEnum }).notNull().default("private"),
  isPublic: integer("is_public").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  userIdIndex: index("playlists_user_id_idx").on(table.userId),
  channelIndex: index("playlists_channel_idx").on(table.channel),
}));

export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;

export const playlistItems = pgTable("playlist_items", {
  id: serial("id").primaryKey(),
  playlistId: integer("playlist_id")
    .notNull()
    .references(() => playlists.id, { onDelete: "cascade" }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  playlistIdIndex: index("playlist_items_playlist_id_idx").on(table.playlistId),
}));

export type PlaylistItem = typeof playlistItems.$inferSelect;
export type NewPlaylistItem = typeof playlistItems.$inferInsert;

// ── Playlist Likes / Favorites ─────────────────────────

export const playlistLikes = pgTable("playlist_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  playlistId: integer("playlist_id")
    .notNull()
    .references(() => playlists.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
}, (table) => ({
  userPlaylistIdx: uniqueIndex("playlist_likes_user_playlist_idx").on(table.userId, table.playlistId),
  playlistIdIndex: index("playlist_likes_playlist_id_idx").on(table.playlistId),
}));

export type PlaylistLike = typeof playlistLikes.$inferSelect;
export type NewPlaylistLike = typeof playlistLikes.$inferInsert;
