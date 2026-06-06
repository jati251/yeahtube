import "dotenv/config";
import { getDb } from "./db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("Creating new tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "likes" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "post_id" integer NOT NULL,
      "is_like" integer NOT NULL,
      "created_at" text DEFAULT now() NOT NULL,
      CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "comments" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "post_id" integer NOT NULL,
      "content" text NOT NULL,
      "created_at" text DEFAULT now() NOT NULL,
      CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "watch_history" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "post_id" integer NOT NULL,
      "watched_at" text DEFAULT now() NOT NULL,
      CONSTRAINT "watch_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "watch_history_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "playlists" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "name" text NOT NULL,
      "is_public" integer DEFAULT 0 NOT NULL,
      "created_at" text DEFAULT now() NOT NULL,
      CONSTRAINT "playlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "playlist_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "playlist_id" integer NOT NULL,
      "post_id" integer NOT NULL,
      "added_at" text DEFAULT now() NOT NULL,
      CONSTRAINT "playlist_items_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "playlist_items_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE cascade ON UPDATE no action
    );
  `);

  console.log("Migration complete!");
  process.exit(0);
}

main().catch(console.error);
