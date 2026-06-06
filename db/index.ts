import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://yeahtube:yeahtube@192.168.1.206:5432/yeahtube";

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined;
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

export function getDb() {
  if (!globalForDb.pool) {
    // Limit max connections per pool so we don't exhaust PG easily
    globalForDb.pool = new Pool({ connectionString, max: 10 });
  }
  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.pool, { schema });
  }
  return globalForDb.db;
}

export { schema };
