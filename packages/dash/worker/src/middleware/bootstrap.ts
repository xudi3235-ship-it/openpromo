import { type ApiEnv, Binding } from "@openpromo/core/actors/index";
import { Database } from "@openpromo/core/drizzle/index";
import { env } from "@openpromo/core/env/index";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";

export const bootstrap =
  (): MiddlewareHandler => async (c: Context<ApiEnv>, next) => {
    // workers use hyperdrive to connect to DB, but when running locally, we use the local connection string
    const connectionString =
      c.env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
    // chain the bindings in providers here.
    return Database.provide(connectionString, async () =>
      // env actually has tons of stuff, we cherry pick
      // the workers bindings
      Binding.provide(
        {
          HYPERDRIVE: c.env.HYPERDRIVE,
          Scheduler: c.env.Scheduler,
          WORKFLOW: c.env.WORKFLOW,
        },
        next,
      ),
    );
  };
