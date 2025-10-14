import type { ApiEnv } from "@core/helpers/api-env";
import { ImageStorage } from "@core/helpers/storage/image";
import { WORKSPACE_ROLE } from "@shared/workspace/auth";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../../middleware/zod-validator";

const createDirectUploadSchema = z.object({
  requireSignedURLs: z.boolean().optional(),
  expiry: z.string().datetime().optional(),
});

export const getImageUploadUrlRoute = new Hono<ApiEnv>().post(
  "/upload-url",
  withWorkspaceRole(WORKSPACE_ROLE.EDITOR),
  zValidator("json", createDirectUploadSchema),
  async (c) => {
    const { requireSignedURLs, expiry } = c.req.valid("json");
    const { id, uploadURL } = await ImageStorage.createDirectUpload({
      metadata: {},
      requireSignedURLs,
      expiry,
    });
    return c.json({ id, uploadURL });
  },
);
