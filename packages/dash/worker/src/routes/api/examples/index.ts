import { Actor } from "@openpromo/core/helpers/actor";
import { type ApiEnv, Binding } from "@openpromo/core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";

export const examplesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/workflow", async (c) => {
    const instance = await c.env.WORKFLOW.create({
      params: {
        actor: Actor.assert("workspace_user"),
        pendingContentID: "example-content-id",
      },
    });
    return c.json({
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
  })
  .get("/binding", async (c) => {
    // test binding ctx
    const scheduler = Binding.getScheduler();
    const res = await scheduler.sayHello();
    return c.text(res);
  });
