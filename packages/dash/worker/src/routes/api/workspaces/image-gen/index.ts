import { EntImageGeneration } from "@core/domain/image-generation";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { withWorkspaceRole } from "../../../../middleware/with-workspace-role";
import { zValidator } from "../../../../middleware/zod-validator";
import { type GenerateImageResponse, generateImages } from "./generate-handler";

const generateImageSchema = z.object({
  productId: z.string(),
  styleId: z.string().optional(),
  referenceImageUrl: z.string().optional(),
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
    const payload = c.req.valid("json");
    const result: GenerateImageResponse = await generateImages(payload);
    return c.json(result);
  });
