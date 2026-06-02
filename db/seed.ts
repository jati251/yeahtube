import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { hashPassword } from "../lib/password";
import { eq } from "drizzle-orm";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://yeahtube:yeahtube@192.168.1.206:5432/yeahtube";

async function seed() {
  console.log("🌱 Seeding database...");

  const pool = new Pool({ connectionString });

  // Create tables if they don't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      is_whitelisted INTEGER NOT NULL DEFAULT 0,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS media (
      id SERIAL PRIMARY KEY,
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS post_tags (
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
    CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_media_post_id ON media(post_id);
    CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
    CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
    CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
  `);

  const db = drizzle(pool, { schema });

  // ── Create initial admin user ──────────────────────────

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
    .then((rows) => rows[0]);

  if (!(await existingAdmin)) {
    const passwordHash = await hashPassword(adminPassword);
    await db.insert(schema.users).values({
      username: adminUsername,
      passwordHash,
      isWhitelisted: 1,
      isAdmin: 1,
    });
    console.log(`✅ Created admin user: ${adminUsername}`);
  } else {
    console.log(`ℹ️ Admin user '${adminUsername}' already exists`);
  }

  // ── Create sample categories ──────────────────────────

  const sampleCategories = [
    { name: "Videos", slug: "videos", description: "Video content" },
    { name: "Photos", slug: "photos", description: "Photo albums and single photos" },
    { name: "Mixed Media", slug: "mixed-media", description: "Posts with both photos and videos" },
    { name: "Projects", slug: "projects", description: "Project-related media" },
    { name: "Archives", slug: "archives", description: "Archived or older content" },
  ];

  for (const cat of sampleCategories) {
    const existing = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.slug, cat.slug))
      .then((rows) => rows[0]);

    if (!existing) {
      await db.insert(schema.categories).values(cat);
      console.log(`✅ Created category: ${cat.name}`);
    }
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
    const existing = await db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.slug, tag.slug))
      .then((rows) => rows[0]);

    if (!existing) {
      await db.insert(schema.tags).values(tag);
      console.log(`✅ Created tag: ${tag.name}`);
    }
  }

  console.log("✅ Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
