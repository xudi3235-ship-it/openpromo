import type { ApiEnv } from "@openpromo/core/actors/index";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";

export const examplesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/workflow", async (c) => {
    const instance = await c.env.WORKFLOW.create();
    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });
  })
  .get("/schedule", async (c) => {
    // example of calling DO
    const stub = c.env.Scheduler.getByName("foo");
    const res = await stub.sayHello();
    const schedule = await stub.schedule();
    return c.json({ res, schedule });
  });
