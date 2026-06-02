import Database from "better-sqlite3";
import path from "path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { hashPassword } from "../lib/password";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  const dbPath = process.env.DATABASE_PATH || "./data/yeahtube.db";
  const sqliteDb = new Database(path.resolve(dbPath));
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");

  // Create tables if they don't exist
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      is_whitelisted INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      storage_key TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
      file_size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      duration REAL,
      thumbnail_key TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_media_post_id ON media(post_id);
    CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
    CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
    CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
  `);

  const db = drizzle(sqliteDb, { schema });

  // ── Create initial admin user ──────────────────────────
  // NOTE: INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD must be set in environment.
  // Do NOT use defaults — a missing password would create a vulnerable admin account.

  const adminUsername = process.env.INITIAL_ADMIN_USERNAME || "admin";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error(
      "❌ INITIAL_ADMIN_PASSWORD environment variable is required.",
      "Set it in .env.local or your environment before running seed.",
    );
    process.exit(1);
  }

  if (adminPassword === "change-me-immediately") {
    console.error(
      "❌ INITIAL_ADMIN_PASSWORD is set to the default value 'change-me-immediately'.",
      "Choose a strong, unique password and update your .env.local file.",
    );
    process.exit(1);
  }

  const existingAdmin = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, adminUsername))
    .get();

  if (!existingAdmin) {
    const passwordHash = await hashPassword(adminPassword);
    db.insert(schema.users).values({
      username: adminUsername,
      passwordHash,
      isWhitelisted: true,
      isAdmin: true,
    }).run();
    console.log(`✅ Created admin user: ${adminUsername}`);
  } else {
    console.log(`ℹ️ Admin user '${adminUsername}' already exists`);
  }

  // ── Create sample tags ─────────────────────────────────

  const sampleTags = [
    { name: "Personal", slug: "personal" },
    { name: "Travel", slug: "travel" },
    { name: "Family", slug: "family" },
    { name: "Nature", slug: "nature" },
    { name: "Technology", slug: "technology" },
    { name: "Art", slug: "art" },
    { name: "Music", slug: "music" },
    { name: "Food", slug: "food" },
    { name: "Sports", slug: "sports" },
    { name: "Events", slug: "events" },
  ];

  for (const tag of sampleTags) {
    const existing = db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.slug, tag.slug))
      .get();

    if (!existing) {
      db.insert(schema.tags).values(tag).run();
      console.log(`✅ Created tag: ${tag.name}`);
    }
  }

  console.log("✅ Seed complete!");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
