import "dotenv/config";
import { getDb } from "./db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  const db = getDb();
  console.log("Adding views to posts table...");

  await db.execute(sql`
    ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "views" integer DEFAULT 0 NOT NULL;
  `);

  console.log("Migration complete!");
  process.exit(0);
}

main().catch(console.error);
