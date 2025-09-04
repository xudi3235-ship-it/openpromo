import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import type { ApiEnv } from "../../../types";

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
    const stub = c.env.DURABLE_OBJECT.getByName("foo");
    const res = await stub.sayHello();
    return c.text(res);
  });
