import { EntImageGeneration } from "@core/domain/image-generation";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../../helpers/error";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";

const generateImageSchema = z.object({
  productId: z.string(),
  styleId: z.string().optional(),
  mode: z.enum(["studio", "style"]).optional().default("studio"),
  batchCount: z.coerce.number().min(1).max(4).optional().default(1),
  prompt: z.string().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(50).default(20),
  productId: z.string().optional(),
});

const deleteBatchSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const imageGenRoute = new Hono<ApiEnv>()
  .use(withWorkspaceRole("workspace_editor"))
  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const { page, pageSize, productId } = c.req.valid("query");

    const result = await EntImageGeneration.list({
      page,
      pageSize,
      productId,
    });

    return c.json({
      generations: result.generations.map((generation) => generation.toJSON()),
      pagination: result.pagination,
    });
  })
  .post("/delete-batch", zValidator("json", deleteBatchSchema), async (c) => {
    const { ids } = c.req.valid("json");

    const result = await EntImageGeneration.deleteBatch(ids);

    return c.json(result);
  })
  .post("/generate", zValidator("json", generateImageSchema), async (c) => {
    const { productId, styleId, mode, batchCount, prompt } =
      c.req.valid("json");

    if (mode === "studio") {
      // Studio shot: clean background, no style reference
      const generations = await Promise.all(
        Array.from({ length: batchCount }, () =>
          EntImageGeneration.generateStudioBackgroundImage(productId, prompt),
        ),
      );

      return c.json({
        results: generations.map((generation) => ({
          imageUrl: generation.data.outputImages[0],
          generation: generation.toJSON(),
        })),
      });
    }

    // Style-based generation: requires a style reference
    if (!styleId) {
      throw new AppError(400, {
        message: "styleId is required for style-based generation",
        userMessage: "Please select a style reference for styled generation.",
      });
    }

    const generations = await Promise.all(
      Array.from({ length: batchCount }, () =>
        EntImageGeneration.generateProductImage({
          productId,
          styleId,
        }),
      ),
    );

    return c.json({
      results: generations.map(({ generation, imageUrl }) => ({
        imageUrl,
        generation: generation.toJSON(),
      })),
    });
  });
