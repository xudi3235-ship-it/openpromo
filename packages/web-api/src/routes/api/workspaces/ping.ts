import { EntPendingContentGroup } from "@openpromo/core/content/entity/index";
import type {
  PendingContentGroupInsert,
  UnifiedContentInsert,
} from "@openpromo/core/schema/content.sql";
import { WORKSPACE_ROLE } from "@openpromo/core/workspace/auth";
import { Hono } from "hono";
import { withAuth } from "../../../middleware/with-auth";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
import type { ApiEnv } from "../../../types";
// import { ping } from "../../generated/api/sdk.gen";
// import { createLiquidClient } from "../../helpers/rpc";
// const client = createLiquidClient();

export const pingRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .use(withWorkspaceRole(WORKSPACE_ROLE.ADMIN))
  .get("/", async (c) => {
    const conn = c.env.HYPERDRIVE.connectionString;
    const message = conn ? "pong from worker" : "no connection";

    const group: PendingContentGroupInsert = {
      workspaceId: "dummy",
      publishingStatus: "SCHEDULED",
    };
    const contents: UnifiedContentInsert[] = [
      {
        workspaceId: "dummy",
        publishingStatus: "SCHEDULED",
        placement: "FB_FEED",
        connectedAccountId: "dummy",
      },
    ];
    const res = await EntPendingContentGroup.create({ group, contents });
    console.log({ res });

    return c.json({ message });
  });
