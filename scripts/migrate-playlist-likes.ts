import "dotenv/config";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://yeahtube:yeahtube@192.168.1.206:5432/yeahtube";

async function main() {
  console.log("🚀 Running playlist_likes DB migration...");
  const pool = new Pool({ connectionString });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS playlist_likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, playlist_id)
      );

      CREATE INDEX IF NOT EXISTS idx_playlist_likes_playlist_id ON playlist_likes(playlist_id);
    `);
    console.log("✅ playlist_likes table & index verified/created successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err);
  } finally {
    await pool.end();
  }
}

main();
