import { EntPendingContentGroup } from "@core/domain/content/entity/index";
import { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import type { ApiEnv } from "@core/helpers/api-env";
import type {
  PendingContentGroupInsert,
  UnifiedContentInsert,
} from "@openpromo/core/schemas/content.sql";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { withAuth } from "../../../middleware/with-auth";
import { withWorkspaceRole } from "../../../middleware/with-workspace-role";
// import { ping } from "../../generated/api/sdk.gen";
// import { createLiquidClient } from "../../helpers/rpc";
// const client = createLiquidClient();

export const pingRoute = new Hono<ApiEnv>()
  .use(withAuth())
  .use(withWorkspaceRole(WORKSPACE_ROLE.ADMIN))
  .get(
    "/",
    describeRoute({
      responses: {
        200: {
          description: "pong",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                },
                required: ["message"],
              },
            },
          },
        },
      },
    }),
    async (c) => {
      const conn = c.env.HYPERDRIVE.connectionString;
      const message = conn ? "pong from worker" : "no connection";

      const group: PendingContentGroupInsert = {
        workspaceId: "dummy",
        publishingStatus: "SCHEDULED",
        pendingContentGroupSpec: {},
      };
      const contents: UnifiedContentInsert[] = [
        {
          workspaceId: "dummy",
          publishingStatus: "SCHEDULED",
          placement: "FB_FEED",
          connectedAccountId: "01K412AGBJJC1W2XXX9HSCH45Z",
        },
      ];
      await EntPendingContentGroup.create({ group, contents });

      return c.json({ message });
    },
  );
