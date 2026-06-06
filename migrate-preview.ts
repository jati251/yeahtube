import "dotenv/config";
import { getDb } from "./db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("Adding preview_key to media table...");

  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "preview_key" text;
  `);

  console.log("Migration complete!");
  process.exit(0);
}

main().catch(console.error);
