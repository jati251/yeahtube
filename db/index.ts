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

    // ── Auto-migration: add missing columns for schema updates ──
    // These run silently if the column already exists.
    runMigration(sqliteDb, `ALTER TABLE posts ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL`);
    runMigration(sqliteDb, `ALTER TABLE posts ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`);

    dbInstance = drizzle(sqliteDb, { schema });
  }
  return dbInstance;
}

function runMigration(db: Database.Database, sql: string) {
  try {
    db.exec(sql);
  } catch {
    // Column or table already exists — this is fine
  }
}

export { schema };
