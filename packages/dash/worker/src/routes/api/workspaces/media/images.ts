import { WORKSPACE_ROLE } from "@openpromo/core/domain/workspace/auth";
import { Actor } from "@openpromo/core/helpers/actor";
import type { ApiEnv } from "@openpromo/core/helpers/api-env";
import { ImageStorage } from "@openpromo/core/helpers/storage/image";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const createDirectUploadSchema = z.object({
  metadata: z.record(z.string(), z.string()).optional(),
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
      const { metadata, requireSignedURLs, expiry } = ctx.req.valid("json");
      const workspaceID = Actor.workspaceID();
      const enhancedMetadata = {
        ...metadata,
        workspaceID,
        actor: Actor.use(),
      };

      const { id, uploadURL } = await ImageStorage.createDirectUpload({
        metadata: enhancedMetadata,
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
