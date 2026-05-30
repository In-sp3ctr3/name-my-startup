import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env, hasDatabaseConfig } from "@/env";
import * as schema from "@/db/schema";

export function getDb() {
  if (!hasDatabaseConfig || !env.DATABASE_URL) {
    return null;
  }

  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

