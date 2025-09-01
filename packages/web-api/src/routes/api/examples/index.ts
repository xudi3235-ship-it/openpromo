import { EntPendingContentGroup } from "@openpromo/core/content/entity/index";
import { Scheduler } from "@openpromo/core/event/scheduler-new";
import { Hono } from "hono";
import { Resource } from "sst";
import { withAuth } from "../../../middleware/with-auth";
import type { ApiEnv } from "../../../types";

export const examplesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/", async (c) => {
    await Scheduler.createSchedule(
      EntPendingContentGroup.Events().Scheduled,
      {
        contentID: "123",
        groupID: "456",
        scheduleName: Resource.Bus.name,
        scheduleArn: Resource.Bus.arn,
      },
      new Date(Date.now() + 60 * 1000),
    );
    return c.json({ message: "Hello, world!" });
  });
