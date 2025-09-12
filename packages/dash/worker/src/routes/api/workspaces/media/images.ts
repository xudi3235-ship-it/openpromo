import { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import type { ApiEnv } from "@core/helpers/api-env";
import { ImageStorage } from "@core/helpers/storage/image";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const createDirectUploadSchema = z.object({
  requireSignedURLs: z.boolean().optional(),
  expiry: z.string().datetime().optional(),
});

const getImageUrlSchema = z.object({
  variant: z.string().optional().default("public"),
});

export const imagesRoute = new Hono<ApiEnv>()
  // direct upload
  .post(
    "/upload-url",
    withWorkspaceRole(WORKSPACE_ROLE.EDITOR),
    zValidator("json", createDirectUploadSchema),
    async (ctx) => {
      const { requireSignedURLs, expiry } = ctx.req.valid("json");
      const { id, uploadURL } = await ImageStorage.createDirectUpload({
        metadata: {},
        requireSignedURLs,
        expiry,
      });
      return ctx.json({ id, uploadURL });
    },
  )

  // delivery url
  .get(
    "/:imageId/url",
    withWorkspaceRole(WORKSPACE_ROLE.VIEWER),
    zValidator("query", getImageUrlSchema),
    async (ctx) => {
      const imageId = ctx.req.param("imageId");
      const { variant } = ctx.req.valid("query");
      const url = await ImageStorage.getImageDeliveryUrl(imageId, variant);
      return ctx.json({ url });
    },
  );
