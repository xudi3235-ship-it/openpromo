import type { Context, MiddlewareHandler } from "hono";
import { AppError } from "../helpers/error";
import type { ApiEnv } from "../types";

export const withAuth: () => MiddlewareHandler =
  () => async (c: Context<ApiEnv>, next) => {
    const user = c.get("user");
    if (!user) {
      throw new AppError(401);
    }

    return next();
  };
