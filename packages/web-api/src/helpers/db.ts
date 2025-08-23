import type { Hyperdrive } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let db: ReturnType<typeof drizzle> | null = null;

export const getDbClient = (hyperdrive: Hyperdrive) => {
  if (!db) {
    db = drizzle(postgres(hyperdrive.connectionString), {
      casing: "snake_case",
    });
  }
  return db;
};
