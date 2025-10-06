import { Actor } from "@core/helpers/actor";
import type { ApiEnv } from "@core/helpers/api-env";
import { Storage } from "@core/helpers/storage";
import { createUploadUrlSchema } from "@shared/storage";
import { Hono } from "hono";
import { zValidator } from "../../../../../middleware/zod-validator";

export const uploadUrlRoute = new Hono<ApiEnv>().post(
  "/",
  zValidator("json", createUploadUrlSchema),
  async (ctx) => {
    const { key, expiresIn } = ctx.req.valid("json");
    const workspaceId = Actor.workspaceID();

    // Namespace the key by workspace
    const namespacedKey = Storage.Key.workspace(workspaceId, "storage", key);

    const uploadUrl = await Storage.getPresignedUrl(
      namespacedKey,
      Storage.PUBLIC_BUCKET,
      {
        expiresIn,
        operation: "put",
      },
    );

    return ctx.json({
      key: namespacedKey,
      uploadUrl,
    });
  },
);
