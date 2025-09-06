import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createContext } from "@/utils/context";
import { env } from "@/utils/env";
import { Log } from "@/utils/log";

const log = Log.create({ namespace: "drizzle" });

export namespace Database {
  export interface Info {
    connectionString: string;
  }

  export const Context = createContext<Info>();

  export function use() {
    // for cf workers, they provide a url override through hyperdrive
    // other services will use the pooled conn from neon.
    try {
      return Context.use();
    } catch {
      // fallback to pooled conn.
      return {
        connectionString: env.DATABASE_URL,
        // connectionString: `postgresql://${Resource.Database.username}:${Resource.Database.password}@${Resource.Database.host}/${Resource.Database.database}?sslmode=require`,
      } as Info;
    }
  }

  export function provide<
    // biome-ignore lint/suspicious/noExplicitAny: expected
    Next extends (...args: any) => any,
  >(connectionString: string, fn: Next) {
    // biome-ignore lint/suspicious/noExplicitAny: expected
    return Context.provide({ connectionString } as any, () => fn());
  }
}

export const getDbClient = () => {
  const { connectionString } = Database.use();
  return drizzle(postgres(connectionString), {
    casing: "snake_case",
    logger:
      process.env.DRIZZLE_LOG === "true"
        ? {
            logQuery(query, params) {
              log.info("query", { query });
              log.info("params", { params });
            },
          }
        : undefined,
  });
};

export type DbClient = ReturnType<typeof getDbClient>;
export const db = getDbClient;
