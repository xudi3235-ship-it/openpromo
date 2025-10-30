import { env as cfEnv } from "cloudflare:workers";
import { env } from "@core/utils/env";
import { Log } from "@core/utils/log";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createContext } from "../../utils/context";

const log = Log.create({ namespace: "drizzle" });

// FIXME: this is causing insane query walltime, but if we dont do this db generate fails..
// Lazy load cloudflare env to avoid module not found errors during build
// let cfEnv: Record<string, unknown> | null = null;
// const getCfEnv = () => {
//   if (cfEnv === null) {
//     try {
//       // biome-ignore lint/suspicious/noExplicitAny: dynamic import required
//       cfEnv = (require("cloudflare:workers") as any).env;
//     } catch {
//       cfEnv = {};
//     }
//   }
//   return cfEnv;
// };

export namespace Database {
  export interface Info {
    connectionString: string;
  }

  export const Context = createContext<Info>();

  export function use() {
    try {
      return Context.use();
    } catch {
      // use hyperdrive for non-local envs
      if (
        cfEnv.HYPERDRIVE &&
        cfEnv.HYPERDRIVE_ID &&
        cfEnv.VITE_ENVIRONMENT !== "local"
      ) {
        // log.info("**on hyperdrive**");
        const hyperdrive = cfEnv.HYPERDRIVE as { connectionString: string };
        return {
          connectionString: hyperdrive.connectionString,
        };
      }
      // log.warn("fallback to pooled conn");
      const connectionString =
        env.DATABASE_URL ?? (cfEnv.DATABASE_URL as string | undefined);
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
