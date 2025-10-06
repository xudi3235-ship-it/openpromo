import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Storage } from "@core/helpers/storage";
import { Hono } from "hono";

export const directUploadRoute = new Hono<ApiEnv>().post("/", async (ctx) => {
  const workspaceId = Actor.workspaceID();
  const formData = await ctx.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return ctx.json({ error: "No file provided" }, 400);
  }

  // Generate unique key
  const timestamp = Date.now();
  const key = Storage.Key.workspace(
    workspaceId,
    "storage",
    `${timestamp}-${file.name}`,
  );

  // Read file as buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to R2
  const { key: uploadedKey, url } = await Storage.upload(
    key,
    buffer,
    Storage.PUBLIC_BUCKET,
    {
      contentType: file.type,
    },
  );

  return ctx.json({
    key: uploadedKey,
    publicUrl: url,
  });
});
