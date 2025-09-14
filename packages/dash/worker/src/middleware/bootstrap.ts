import { type ApiEnv, Binding } from "@openpromo/core/helpers/api-env";
import { Database } from "@openpromo/core/helpers/db/index";
import { env } from "@openpromo/core/utils/env";
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
          WorkspacePusher: c.env.WorkspacePusher,
          WORKFLOW: c.env.WORKFLOW,
        },
        next,
      ),
    );
  };
