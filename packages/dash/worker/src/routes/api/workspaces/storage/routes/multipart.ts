import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Storage } from "@core/helpers/storage";
import {
  abortMultipartSchema,
  completeMultipartSchema,
  initiateMultipartSchema,
} from "@shared/storage";
import { Hono } from "hono";
import { zValidator } from "../../../../../middleware/zod-validator";

export const multipartRoute = new Hono<ApiEnv>()
  // Initiate multipart upload and get presigned URLs for each part
  .post(
    "/initiate",
    zValidator("json", initiateMultipartSchema),
    async (ctx) => {
      const { key, partCount, expiresIn } = ctx.req.valid("json");
      const workspaceId = Actor.workspaceID();

      // Namespace the key by workspace
      const namespacedKey = Storage.Key.workspace(workspaceId, "storage", key);

      const { uploadId, urls } = await Storage.getPresignedMultipartUrls(
        namespacedKey,
        Storage.PUBLIC_BUCKET,
        partCount,
        { expiresIn },
      );

      return ctx.json({
        key: namespacedKey,
        uploadId,
        urls,
      });
    },
  )

  // Complete multipart upload
  .post(
    "/complete",
    zValidator("json", completeMultipartSchema),
    async (ctx) => {
      const { key, uploadId, parts } = ctx.req.valid("json");

      const result = await Storage.completeMultipartUpload(
        key,
        Storage.PUBLIC_BUCKET,
        uploadId,
        parts,
      );

      return ctx.json(result);
    },
  )

  // Abort multipart upload
  .post("/abort", zValidator("json", abortMultipartSchema), async (ctx) => {
    const { key, uploadId } = ctx.req.valid("json");

    await Storage.abortMultipartUpload(key, Storage.PUBLIC_BUCKET, uploadId);

    return ctx.json({ success: true });
  });
