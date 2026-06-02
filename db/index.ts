import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = process.env.DATABASE_PATH || "./data/yeahtube.db";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!dbInstance) {
    const sqliteDb = new Database(path.resolve(dbPath));

    // Enable WAL mode for better concurrent read performance
    sqliteDb.pragma("journal_mode = WAL");
    // Enable foreign keys
    sqliteDb.pragma("foreign_keys = ON");

    dbInstance = drizzle(sqliteDb, { schema });
  }
  return dbInstance;
}

export { schema };
