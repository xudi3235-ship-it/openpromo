import { EntImageGeneration } from "@core/domain/image-generation";
import { EntStyleComponent } from "@core/domain/style-component";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../../../helpers/error";
import { zValidator } from "../../../../../middleware/zod-validator";

const paramsSchema = z.object({
  styleId: z.string(),
  generationId: z.string(),
});

export const deleteStyleGenerationRoute = new Hono<ApiEnv>().delete(
  "/:styleId/generations/:generationId",
  zValidator("param", paramsSchema),
  async (c) => {
    const { styleId, generationId } = c.req.valid("param");

    const style = await EntStyleComponent.fromID(styleId);
    if (!style)
      throw new AppError(404, {
        message: `Style component ${styleId} not found`,
        userMessage: "Style not found.",
      });

    const generation = await EntImageGeneration.fromID(generationId);

    if (!generation)
      throw new AppError(404, {
        message: `Generation ${generationId} not found for style ${styleId}`,
        userMessage: "Generation not found.",
      });

    await generation.delete();

    return c.json({ success: true });
  },
);
