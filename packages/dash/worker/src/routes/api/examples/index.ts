import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
export const examplesRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .get("/workflow", async (c) => {
    const instance = await c.env.WORKFLOW.create({
      params: {
        actor: Actor.create("workspace_user", {
          userID: "example-user-id",
          email: "example-email@example.com",
          organizationID: "example-organization-id",
          role: "org_admin",
          workspaceID: "example-workspace-id",
          workspaceSlug: "example-workspace-slug",
        }),
        pendingContentID: "example-content-id",
      },
    });
    return c.json({
      id: instance.id,
      details: await instance.status(),
    });
  })
  .get("/schedule", async (c) => {
    return c.text("not implemented yet");
  })
  .get("/container", async (c) => {
    const stub = c.env.ContainerBackend.getByName("default");
    const res = await stub.ping();
    const body = await res.json();

    return c.json({ status: res.status, body });
  });
