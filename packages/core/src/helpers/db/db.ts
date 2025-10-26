import { env as cfEnv } from "cloudflare:workers";
import { env } from "@core/utils/env";
import { Log } from "@core/utils/log";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createContext } from "../../utils/context";

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
      log.warn("no db ctx, fall back to env db url");
      // fallback to pooled conn.
      const connectionString = env.DATABASE_URL ?? cfEnv.DATABASE_URL;
      if (!connectionString)
        throw new Error("No DATABASE_URL found in environment");
      return {
        connectionString,
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
