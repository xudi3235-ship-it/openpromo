import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import type { ApiEnv } from "../../../types";

export const examplesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/workflow", async (c) => {
    // return c.text("not ready");
    const instance = await c.env.WORKFLOW.create();
    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  })
  .get("/", async (c) => {
    return c.text("test examples route");
  });
