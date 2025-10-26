import { type ApiEnv, Binding } from "@openpromo/core/helpers/api-env";
import { Database } from "@openpromo/core/helpers/db/index";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";

function resolveDbConnectionString(env: ApiEnv["Bindings"]): string {
  // workers use hyperdrive to connect to DB, but when running locally, we use the local connection string
  if (env.VITE_ENVIRONMENT === "local") {
    return env.DATABASE_URL;
  }
  return env.HYPERDRIVE.connectionString ?? env.DATABASE_URL;
}

export const bootstrap =
  (): MiddlewareHandler => async (c: Context<ApiEnv>, next) => {
    // workers use hyperdrive to connect to DB, but when running locally, we use the local connection string
    const connectionString = resolveDbConnectionString(c.env);
    // chain the bindings in providers here.
    return Database.provide(connectionString, async () =>
      Binding.provide(
        {
          ...c.env,
        },
        next,
      ),
    );
  };
