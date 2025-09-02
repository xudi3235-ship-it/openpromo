import { EntPendingContentGroup } from "@openpromo/core/content/entity/index";
import { Scheduler } from "@openpromo/core/event/scheduler";
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
    await Scheduler.createSchedule(
      EntPendingContentGroup.Events().Scheduled,
      {
        contentID: "123",
        groupID: "456",
        scheduleName: "TODO: move off aws",
        scheduleArn: "TODO: move off aws",
      },
      new Date(Date.now() + 60 * 1000),
    );
    return c.json({ message: "Hello, world!" });
  });
