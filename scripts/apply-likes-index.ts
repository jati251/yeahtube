import "../db/env";
import { getDb } from "../db/index";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("Applying unique index on likes (user_id, post_id)...");
  await db.execute(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS likes_user_post_idx ON likes (user_id, post_id);`
  );
  console.log("✅ Successfully ensured likes_user_post_idx exists on PostgreSQL!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Index migration error:", err);
  process.exit(1);
});
