import { EntImageGeneration } from "@core/domain/image-generation";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const generateImageSchema = z.object({
  productId: z.string(),
  styleId: z.string().optional(),
});

export const imageGenRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .post("/generate", zValidator("json", generateImageSchema), async (c) => {
    const { productId, styleId } = c.req.valid("json");

    const { generation, imageUrl } = await EntImageGeneration.createAndStart({
      productId,
      styleId,
    });

    return c.json({
      imageUrl: imageUrl ?? "TODO: replace this once migration is done",
      generation: generation.toJSON(),
    });
  });
