import { WORKSPACE_ROLE } from "@core/domain/workspace/auth";
import type { ApiEnv } from "@core/helpers/api-env";
import { VideoStorage } from "@core/helpers/storage/video";
import { env } from "@core/utils/env";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const createDirectUploadSchema = z.object({
  requireSignedURLs: z.boolean().optional(),
  expiry: z.string().optional(),
  maxDurationSeconds: z.number(),
});

export const videosRoute = new Hono<ApiEnv>()
  // direct upload
  .post(
    "/upload-url",
    withWorkspaceRole(WORKSPACE_ROLE.EDITOR),
    zValidator("json", createDirectUploadSchema),
    async (ctx) => {
      const { requireSignedURLs, expiry, maxDurationSeconds } =
        ctx.req.valid("json");
      const { uid, uploadURL } = await VideoStorage.createDirectUpload({
        requireSignedURLs,
        expiry,
        maxDurationSeconds,
        // meta: {},
      });
      const previewIframeUrl = `https://${env.CLOUDFLARE_STREAM_CUSTOMER_DOMAIN}/${uid}/iframe`;
      const thumbnailUrl = `https://${env.CLOUDFLARE_STREAM_CUSTOMER_DOMAIN}/${uid}/thumbnails/thumbnail.jpg?time=1&height=400`;
      return ctx.json({ id: uid, uploadURL, previewIframeUrl, thumbnailUrl });
    },
  );
