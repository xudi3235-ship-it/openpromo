import { type ApiEnv, Binding } from "@openpromo/core/helpers/api-env";
import type { Context } from "hono";
import type { MiddlewareHandler } from "hono/types";

export const bootstrap =
  (): MiddlewareHandler => async (c: Context<ApiEnv>, next) => {
    return Binding.provide(
      {
        ...c.env,
      },
      next,
    );
  };
