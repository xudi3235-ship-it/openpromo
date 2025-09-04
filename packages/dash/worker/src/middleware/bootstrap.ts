import type { ApiEnv } from "@openpromo/core/actors/index";
import { Database } from "@openpromo/core/drizzle/index";
import { env } from "@openpromo/core/env/index";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";

export const bootstrap =
  (): MiddlewareHandler => async (c: Context<ApiEnv>, next) => {
    // workers use hyperdrive to connect to DB, but when running locally, we use the local connection string
    const connectionString =
      c.env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
    return Database.provide(connectionString, next);
  };
