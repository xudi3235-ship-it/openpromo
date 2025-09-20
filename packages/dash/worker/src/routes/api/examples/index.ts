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
    const { stream, contentType, contentLength, filename } =
      await stub.resizeVideo({
        videoUrl:
          "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        width: 640,
        height: 480,
      });

    const headers = new Headers({ "Content-Type": contentType });
    if (contentLength !== undefined) {
      headers.set("Content-Length", contentLength.toString());
    }
    if (filename) {
      headers.set("Content-Disposition", `inline; filename="${filename}"`);
    }

    return new Response(stream, { status: 200, headers });
  });
