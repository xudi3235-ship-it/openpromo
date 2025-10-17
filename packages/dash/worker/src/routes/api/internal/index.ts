import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";

// internal only routes, for testing and debugging
export const internalRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/wip", async (c) => {
    return c.text("work in progress");
  });
