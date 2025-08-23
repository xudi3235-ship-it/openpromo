import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ApiEnv } from "../types";

export const withAuth: () => MiddlewareHandler =
  () => async (c: Context<ApiEnv>, next) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401);
    }

    return next();
  };
