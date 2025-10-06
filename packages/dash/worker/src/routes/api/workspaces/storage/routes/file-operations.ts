import type { ApiEnv } from "@core/helpers/api-env";
import { Storage } from "@core/helpers/storage";
import { getUrlSchema } from "@shared/storage";
import { Hono } from "hono";
import { zValidator } from "../../../../../middleware/zod-validator";

export const fileOperationsRoute = new Hono<ApiEnv>()
  // Get presigned URL for download or upload
  .get("/:key/url", zValidator("query", getUrlSchema), async (ctx) => {
    const key = ctx.req.param("key");
    const { expiresIn, operation } = ctx.req.valid("query");

    const url = await Storage.getPresignedUrl(key, Storage.PUBLIC_BUCKET, {
      expiresIn,
      operation,
    });

    return ctx.json({ url });
  })

  // Get public URL (no signing)
  .get("/public-url", async (ctx) => {
    const key = ctx.req.query("key");

    if (!key) {
      return ctx.json({ error: "key is required" }, 400);
    }

    const url = Storage.publicUrl(key, Storage.PUBLIC_BUCKET);

    return ctx.json({ url });
  })

  // Delete file
  .delete("/:key", async (ctx) => {
    const key = ctx.req.param("key");

    await Storage.deleteFile(key, Storage.PUBLIC_BUCKET);

    return ctx.json({ success: true });
  });
