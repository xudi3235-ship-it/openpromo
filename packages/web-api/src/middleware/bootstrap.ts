import { Database } from "@openpromo/core/drizzle/index";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";
import type { ApiEnv } from "../types";

export const bootstrap =
  (): MiddlewareHandler => async (c: Context<ApiEnv>, next) => {
    // workers use hyperdrive to connect to DB
    const connectionString = c.env.HYPERDRIVE.connectionString;
    return Database.provide(connectionString, next);
  };
