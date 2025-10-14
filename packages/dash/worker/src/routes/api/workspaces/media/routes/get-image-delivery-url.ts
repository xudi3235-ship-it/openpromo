import type { ApiEnv } from "@core/helpers/api-env";
import { ImageStorage } from "@core/helpers/storage/image";
import { WORKSPACE_ROLE } from "@shared/workspace/auth";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../../middleware/zod-validator";

const getImageUrlSchema = z.object({
  variant: z.string().optional().default("public"),
});

export const getImageDeliveryUrlRoute = new Hono<ApiEnv>().get(
  "/:imageId/url",
  withWorkspaceRole(WORKSPACE_ROLE.VIEWER),
  zValidator("query", getImageUrlSchema),
  async (c) => {
    const imageId = c.req.param("imageId");
    const { variant } = c.req.valid("query");
    const url = await ImageStorage.getImageDeliveryUrl(imageId, variant);
    return c.json({ url });
  },
);
