import { EntImageGeneration } from "@core/domain/image-generation";
import { EntStyleComponent } from "@core/domain/style-component";
import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import * as z from "zod";
import { AppError } from "../../../../../helpers/error";
import { zValidator } from "../../../../../middleware/zod-validator";

const paramsSchema = z.object({
  styleId: z.string(),
});

const querySchema = z.object({
  page: z.coerce.number().default(1),
  pageSize: z.coerce.number().max(30).default(12),
  productId: z.string().optional(),
  productOnly: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => {
      if (value == null) return undefined;
      if (typeof value === "boolean") return value;
      return value === "true" || value === "1";
    }),
});

export const listStyleGenerationsRoute = new Hono<ApiEnv>().get(
  "/:styleId/generations",
  zValidator("param", paramsSchema),
  zValidator("query", querySchema),
  async (c) => {
    const { styleId } = c.req.valid("param");
    const { page, pageSize, productId, productOnly } = c.req.valid("query");

    const style = await EntStyleComponent.fromID(styleId).catch(() => null);

    if (!style) {
      throw new AppError(404, {
        message: `Style component ${styleId} not found`,
        userMessage: "Style not found.",
      });
    }

    const result = await EntImageGeneration.listForStyle(style.data.id, {
      page,
      pageSize,
      productId: productOnly ? (productId ?? null) : productId,
    });

    return c.json({
      generations: result.generations.map((generation) => generation.toJSON()),
      pagination: result.pagination,
    });
  },
);
